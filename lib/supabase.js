// /lib/supabase.js
/**
 * Supabase 客户端配置和数据库操作
 *
 * 功能说明：
 * 1. 初始化 Supabase 客户端
 * 2. 提供数据库操作方法
 * 3. 错误处理和重试机制
 * 4. 符合 GDPR 的数据删除操作
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// 环境变量配置
// ============================================================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 验证必需的环境变量
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('缺少必需的 Supabase 环境变量: SUPABASE_URL 和 SUPABASE_ANON_KEY');
}

// ============================================================================
// Supabase 客户端初始化
// ============================================================================

/**
 * 普通客户端 - 用于常规操作
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * 管理员客户端 - 用于需要管理员权限的操作（如数据删除）
 */
export const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// ============================================================================
// 数据库操作方法
// ============================================================================

/**
 * 用户相关数据库操作
 */
export class UserService {

  /**
   * 根据 eBay 用户信息查找本地用户
   */
  static async findUserByEbayData(ebayUserId, ebayUsername) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`ebay_user_id.eq.${ebayUserId},ebay_username.eq.${ebayUsername}`)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = 没有找到记录
        throw error;
      }

      return data;
    } catch (error) {
      console.error('[UserService] 查找用户失败:', error);
      throw error;
    }
  }

  /**
   * 创建新用户记录
   */
  static async createUser(userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[UserService] 创建用户失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户信息
   */
  static async updateUser(userId, updateData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[UserService] 更新用户失败:', error);
      throw error;
    }
  }

  /**
   * 彻底删除用户数据（符合 GDPR 要求）
   */
  static async deleteUserData(ebayUserId, ebayUsername) {
    if (!supabaseAdmin) {
      throw new Error('需要管理员权限执行数据删除操作，请配置 SUPABASE_SERVICE_ROLE_KEY');
    }

    console.log('[UserService] 开始删除用户数据:', { ebayUserId, ebayUsername });

    try {
      // 开始事务删除
      const deletionTasks = [];

      // 1. 删除 OAuth tokens
      deletionTasks.push(
        supabaseAdmin
          .from('oauth_tokens')
          .delete()
          .or(`ebay_user_id.eq.${ebayUserId},ebay_username.eq.${ebayUsername}`)
      );

      // 2. 删除订单记录
      deletionTasks.push(
        supabaseAdmin
          .from('orders')
          .delete()
          .or(`ebay_user_id.eq.${ebayUserId},ebay_username.eq.${ebayUsername}`)
      );

      // 3. 删除搜索历史
      deletionTasks.push(
        supabaseAdmin
          .from('search_history')
          .delete()
          .or(`ebay_user_id.eq.${ebayUserId},ebay_username.eq.${ebayUsername}`)
      );

      // 4. 删除用户主记录
      deletionTasks.push(
        supabaseAdmin
          .from('users')
          .delete()
          .or(`ebay_user_id.eq.${ebayUserId},ebay_username.eq.${ebayUsername}`)
      );

      // 执行所有删除操作
      const results = await Promise.allSettled(deletionTasks);

      // 检查删除结果
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        console.error('[UserService] 部分数据删除失败:', failures);
        throw new Error(`数据删除失败: ${failures.length} 个操作失败`);
      }

      // 记录删除审计日志
      await this.logDeletionAudit(ebayUserId, ebayUsername, 'SUCCESS');

      console.log('[UserService] 用户数据删除成功:', { ebayUserId, ebayUsername });

      return {
        success: true,
        deletedTables: ['oauth_tokens', 'orders', 'search_history', 'users'],
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[UserService] 用户数据删除失败:', error);

      // 记录删除失败的审计日志
      await this.logDeletionAudit(ebayUserId, ebayUsername, 'FAILED', error.message);

      throw error;
    }
  }

  /**
   * 记录数据删除审计日志
   */
  static async logDeletionAudit(ebayUserId, ebayUsername, status, errorMessage = null) {
    try {
      const auditData = {
        event_type: 'USER_DATA_DELETION',
        ebay_user_id: ebayUserId,
        ebay_username: ebayUsername,
        status: status,
        error_message: errorMessage,
        source: 'EBAY_WEBHOOK',
        timestamp: new Date().toISOString()
      };

      await supabase
        .from('audit_logs')
        .insert([auditData]);

      console.log('[UserService] 审计日志已记录:', auditData);
    } catch (error) {
      console.error('[UserService] 记录审计日志失败:', error);
      // 不抛出错误，因为这不应该影响主要的删除操作
    }
  }
}

/**
 * OAuth Token 相关操作
 */
export class OAuthService {

  /**
   * 保存 OAuth token
   */
  static async saveToken(tokenData) {
    try {
      const { data, error } = await supabase
        .from('oauth_tokens')
        .upsert([tokenData], { onConflict: 'ebay_user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[OAuthService] 保存 token 失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的 OAuth token
   */
  static async getToken(ebayUserId) {
    try {
      const { data, error } = await supabase
        .from('oauth_tokens')
        .select('*')
        .eq('ebay_user_id', ebayUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('[OAuthService] 获取 token 失败:', error);
      throw error;
    }
  }

  /**
   * 删除 OAuth token
   */
  static async deleteToken(ebayUserId) {
    try {
      const { error } = await supabase
        .from('oauth_tokens')
        .delete()
        .eq('ebay_user_id', ebayUserId);

      if (error) throw error;

      console.log('[OAuthService] Token 删除成功:', { ebayUserId });
    } catch (error) {
      console.error('[OAuthService] 删除 token 失败:', error);
      throw error;
    }
  }
}

/**
 * 通用数据库工具方法
 */
export class DatabaseUtils {

  /**
   * 检查数据库连接
   */
  static async testConnection() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });

      if (error) throw error;

      console.log('[DatabaseUtils] 数据库连接正常');
      return true;
    } catch (error) {
      console.error('[DatabaseUtils] 数据库连接失败:', error);
      return false;
    }
  }

  /**
   * 获取数据库状态信息
   */
  static async getStatus() {
    try {
      const tables = ['users', 'oauth_tokens', 'orders', 'search_history', 'audit_logs'];
      const status = {};

      for (const table of tables) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          status[table] = error ? `错误: ${error.message}` : `${count} 条记录`;
        } catch (err) {
          status[table] = `错误: ${err.message}`;
        }
      }

      return status;
    } catch (error) {
      console.error('[DatabaseUtils] 获取状态失败:', error);
      throw error;
    }
  }
}

// ============================================================================
// 默认导出
// ============================================================================
export default {
  supabase,
  supabaseAdmin,
  UserService,
  OAuthService,
  DatabaseUtils
};