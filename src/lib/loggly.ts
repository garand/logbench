import axios from 'axios'
import type { LogLevel } from '../../generated/prisma/browser'

export interface LogglyEvent {
  id: string
  timestamp: number
  logmsg: string
  event: Record<string, unknown>
}

export interface LogglySearchResponse {
  rsid: { id: string }
}

export interface LogglyEventsResponse {
  total_events: number
  page: number
  events: Array<{ id: string; timestamp: number; logmsg: string; event: Record<string, unknown> }>
}

function logglyBaseUrl(subdomain: string) {
  return `https://${encodeURIComponent(subdomain)}.loggly.com/apiv2`
}

/**
 * Submit a search query to Loggly and get back an RSID for retrieving events.
 */
export async function logglySearch(
  subdomain: string,
  token: string,
  query: string,
  from = '-24h',
  until = 'now',
): Promise<string> {
  const url = `${logglyBaseUrl(subdomain)}/search`
  const response = await axios.get<LogglySearchResponse>(url, {
    params: { q: query, from, until },
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data.rsid.id
}

/**
 * Retrieve events from Loggly using an RSID from a previous search.
 */
export async function logglyEvents(
  subdomain: string,
  token: string,
  rsid: string,
  page = 0,
): Promise<LogglyEventsResponse> {
  const url = `${logglyBaseUrl(subdomain)}/events`
  const response = await axios.get<LogglyEventsResponse>(url, {
    params: { rsid, page },
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

/**
 * Map a Loggly syslog severity / level string to our LogLevel enum.
 */
export function mapLogglyLevel(event: Record<string, unknown>): LogLevel {
  const syslogSeverity = event['syslog.severity'] as string | undefined
  const level = (syslogSeverity ?? '').toUpperCase()
  if (level === 'ERROR' || level === 'ERR' || level === 'CRITICAL' || level === 'ALERT' || level === 'EMERGENCY') {
    return 'ERROR'
  }
  if (level === 'WARNING' || level === 'WARN') {
    return 'WARNING'
  }
  return 'INFO'
}
