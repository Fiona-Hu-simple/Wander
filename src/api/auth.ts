import request from '@/api/client';
import type { ApiResponse, AuthSession, UserIdentity } from '@/types/auth'

/**
 * 用户登录
 * @param {string} username 用户名
 * @param {string} password 密码
 * @returns {Promise} 返回 { token, userId, username }
 */
export function loginApi(username: string, password: string) {
  return request.post<ApiResponse<AuthSession>>('/auth/login', { username, password });
}

/**
 * 用户注册
 * @param {string} username 用户名
 * @param {string} password 密码
 * @returns {Promise} 返回 { userId, username }
 */
export function registerApi(username: string, password: string) {
  return request.post<ApiResponse<UserIdentity>>('/auth/register', { username, password });
}
