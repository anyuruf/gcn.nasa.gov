/*!
 * Copyright © 2022 United States Government as represented by the Administrator
 * of the National Aeronautics and Space Administration. No copyright is claimed
 * in the United States under Title 17, U.S. Code. All Other Rights Reserved.
 *
 * SPDX-License-Identifier: NASA-1.3
 */

import { tables } from '@architect/functions'
import type { DynamoDB } from '@aws-sdk/client-dynamodb'
import type { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'
import { DynamoDBAutoIncrement } from '@nasa-gcn/dynamodb-autoincrement'
import { formatAuthor } from '../user/index'
import { getUser } from '../__auth/user.server'

async function getDynamoDBAutoIncrement() {
  const db = await tables()
  const doc = db._doc as unknown as DynamoDBDocument

  const tableName = db.name('circulars')
  const counterTableName = db.name('auto_increment_metadata')
  const dangerously =
    (await (db._db as unknown as DynamoDB).config.endpoint?.())?.hostname ==
    'localhost'

  return new DynamoDBAutoIncrement({
    doc,
    counterTableName,
    counterTableKey: { tableName: 'circulars' },
    counterTableAttributeName: 'circularId',
    tableName: tableName,
    tableAttributeName: 'circularId',
    initialValue: 1,
    dangerously,
  })
}

export interface CircularMetadata {
  circularId: number
  subject: string
}

export interface Circular extends CircularMetadata {
  sub?: string
  createdOn: number
  body: string
  submitter: string
}

/** List circulars in order of descending ID. */
export async function list({
  page,
  limit,
}: {
  /** Page in results to retrieve. Note that indexing is 1-based. */
  page: number
  /** Number of results per page. */
  limit: number
}): Promise<{ items: CircularMetadata[]; totalPages: number }> {
  const db = await tables()
  const autoincrement = await getDynamoDBAutoIncrement()
  const last = (await autoincrement.getLast()) ?? 1

  // Calculate pagination assuming that last === the number of records.
  const totalPages = Math.ceil(last / limit)
  const circularId = last - (page - 1) * limit + 1

  const { Items } = await db.circulars.query({
    Limit: limit,
    ScanIndexForward: false,
    ExclusiveStartKey: { dummy: 0, circularId },
    ProjectionExpression: 'circularId, subject',
    KeyConditionExpression: 'dummy = :dummy',
    ExpressionAttributeValues: { ':dummy': 0 },
  })

  return { items: Items, totalPages }
}

/** Get a circular by ID. */
export async function get(circularId: number): Promise<Circular> {
  const db = await tables()
  const result = await db.circulars.get({
    dummy: 0,
    circularId,
  })
  if (!result)
    throw new Response('The requested circular does not exist', {
      status: 404,
    })
  return result
}

/** Delete a circular by ID.
 * Throws an HTTP error if:
 *  - The current user is not signed in
 *  - The current user is not in the moderator group
 */
export async function remove(circularId: number, request: Request) {
  const user = await getUser(request)
  if (!user?.groups.includes('gcn.nasa.gov/circular-moderator'))
    throw new Response('User is not a moderator', {
      status: 403,
    })

  const db = await tables()
  await db.circulars.delete({ dummy: 0, circularId: circularId })
}

/**
 * Adds a new entry into the GCN Circulars table
 *
 * Throws an HTTP error if:
 *  - The current user is not signed in, verified by the class's #sub and #groups properties
 *  - The current user is not in the submitters group
 *  - Body or Subject are blank
 * @param body - main content of the Circular
 * @param subject - the title/subject line of the Circular
 */
export async function put(subject: string, body: string, request: Request) {
  const [user, autoincrement] = await Promise.all([
    getUser(request),
    getDynamoDBAutoIncrement(),
  ])
  if (!user?.groups.includes('gcn.nasa.gov/circular-submitter'))
    throw new Response('User is not in the submitters group', {
      status: 403,
    })
  if (!body || !subject)
    throw new Response('Subject and Body cannot be blank', { status: 400 })

  await autoincrement.put({
    dummy: 0,
    createdOn: Date.now(),
    subject,
    body,
    sub: user.sub,
    submitter: formatAuthor(user),
  })
}

export function subjectIsValid(subject: string) {
  return validSubjectKeywords.some((x) => subject.startsWith(x))
}

export const validSubjectKeywords = [
  'AGILE',
  'ANTARES',
  'AXP',
  'Chandra',
  'Fermi',
  'FXT',
  'grb',
  'GRB',
  'GW',
  'HAWC',
  'HST',
  'IBAS',
  'IceCube',
  'ICECUBE',
  'INTEGRAL',
  'IPN',
  'KONUS',
  'LIGO',
  'LVC',
  'MAXI',
  'RATIR',
  'SDSS',
  'SGR',
  'Swift',
  'SWIFT',
  'Virgo',
  'VLA',
  'VLBI',
  'XRB',
  'XTR',
]