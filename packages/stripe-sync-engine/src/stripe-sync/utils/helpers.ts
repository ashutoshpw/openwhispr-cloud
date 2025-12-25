import Stripe from 'stripe'
import { StripeSyncContext } from '../types'

export function getUniqueIds<T>(entries: T[], key: string): string[] {
  const set = new Set(
    entries
      .map((subscription) => subscription?.[key as keyof T]?.toString())
      .filter((it): it is string => Boolean(it))
  )

  return Array.from(set)
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize))
  }
  return result
}

export async function expandEntity<
  K,
  P extends keyof T,
  T extends { id?: string } & { [key in P]?: Stripe.ApiList<K> | null },
>(
  context: StripeSyncContext,
  entities: T[],
  property: P,
  listFn: (id: string) => Stripe.ApiListPromise<K>
) {
  if (!context.config.autoExpandLists) return

  for (const entity of entities) {
    if (!entity.id) continue

    if (entity[property]?.has_more) {
      const allData: K[] = []
      for await (const fetchedEntity of listFn(entity.id)) {
        allData.push(fetchedEntity)
      }

      entity[property] = {
        ...entity[property],
        data: allData,
        has_more: false,
      }
    }
  }
}

export async function fetchMissingEntities<T>(
  ids: string[],
  fetch: (id: string) => Promise<Stripe.Response<T>>
): Promise<T[]> {
  if (!ids.length) return []

  const entities: T[] = []

  for (const id of ids) {
    const entity = await fetch(id)
    entities.push(entity)
  }

  return entities
}

