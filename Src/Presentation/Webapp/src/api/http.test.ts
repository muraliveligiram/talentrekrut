import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from './http'
import { tokenStore } from '../features/auth/tokenStore'

function response(
  config: InternalAxiosRequestConfig,
  status = 200,
): AxiosResponse {
  return {
    config,
    data: {},
    headers: {},
    status,
    statusText: status === 200 ? 'OK' : 'Unauthorized',
  }
}

describe('shared API client authentication', () => {
  beforeEach(() => {
    tokenStore.clear()
  })

  it('sends the stored bearer token with API requests', async () => {
    tokenStore.set('signed-access-token')
    let authorization: unknown

    await http.get('/jobs', {
      adapter: async (config) => {
        authorization = config.headers.get('Authorization')
        return response(config)
      },
    })

    expect(authorization).toBe('Bearer signed-access-token')
  })

  it('clears the session and notifies the app when an API returns 401', async () => {
    tokenStore.set('expired-access-token')
    const onExpired = vi.fn()
    window.addEventListener('auth:expired', onExpired)

    try {
      await expect(http.get('/jobs', {
        adapter: async (config) => {
          throw new AxiosError(
            'Request failed with status code 401',
            AxiosError.ERR_BAD_REQUEST,
            config,
            undefined,
            response(config, 401),
          )
        },
      })).rejects.toMatchObject({ response: { status: 401 } })

      expect(tokenStore.get()).toBeNull()
      expect(onExpired).toHaveBeenCalledOnce()
    } finally {
      window.removeEventListener('auth:expired', onExpired)
    }
  })
})
