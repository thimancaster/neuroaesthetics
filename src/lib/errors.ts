/**
 * Error sanitization utility for secure error handling
 * Maps internal system errors to user-friendly messages
 * Prevents information disclosure attacks
 */

// Error pattern to user-friendly message mapping
const ERROR_MAP: Record<string, string> = {
  // Authentication errors
  'invalid login credentials': 'Email ou senha incorretos',
  'user already registered': 'Este email já está cadastrado',
  'already registered': 'Este email já está cadastrado',
  'email not confirmed': 'Por favor, confirme seu email antes de fazer login',
  'jwt expired': 'Sessão expirada. Faça login novamente',
  'invalid jwt': 'Sessão inválida. Faça login novamente',
  'jwt malformed': 'Sessão inválida. Faça login novamente',
  'refresh_token_not_found': 'Sessão expirada. Faça login novamente',
  'password should be at least': 'A senha deve ter pelo menos 6 caracteres',
  'unable to validate email address': 'Email inválido',
  
  // Database errors
  'duplicate key': 'Este registro já existe',
  'unique constraint': 'Este registro já existe',
  'foreign key': 'Operação não permitida devido a dependências',
  'foreign key constraint': 'Não é possível remover este item pois há dados vinculados',
  'violates check constraint': 'Dados fornecidos são inválidos',
  'null value in column': 'Campos obrigatórios não preenchidos',
  'violates not-null': 'Campos obrigatórios não preenchidos',
  'row level security': 'Acesso negado a este recurso',
  'permission denied': 'Você não tem permissão para esta ação',
  'policy violation': 'Operação não autorizada',
  
  // Network errors
  'network request failed': 'Erro de conexão. Verifique sua internet',
  'failed to fetch': 'Erro de conexão. Verifique sua internet',
  'networkerror': 'Erro de conexão. Verifique sua internet',
  'timeout': 'A operação demorou muito. Tente novamente',
  'aborted': 'Operação cancelada',
  
  // Storage errors
  'payload too large': 'Arquivo muito grande',
  'the object exceeds the maximum allowed size': 'Arquivo muito grande',
  'invalid mime type': 'Tipo de arquivo não permitido',
  'storage quota exceeded': 'Limite de armazenamento excedido',
  
  // API errors
  'rate limit': 'Muitas tentativas. Aguarde um momento',
  'too many requests': 'Muitas tentativas. Aguarde um momento',
  'service unavailable': 'Serviço temporariamente indisponível',
  'internal server error': 'Erro interno. Tente novamente mais tarde',
  
  // Validation errors
  'invalid email': 'Email inválido',
  'invalid phone': 'Telefone inválido',
  'invalid date': 'Data inválida',
  'invalid cpf': 'CPF inválido',
};

/**
 * Sanitizes error messages to prevent information disclosure
 * Returns user-friendly messages in Portuguese
 */
export function sanitizeError(error: Error | string | unknown): string {
  const errorMsg = typeof error === 'string' 
    ? error 
    : error instanceof Error 
      ? error.message 
      : 'Erro desconhecido';
  
  const lowerError = errorMsg.toLowerCase();
  
  // Check if error matches known patterns
  for (const [pattern, message] of Object.entries(ERROR_MAP)) {
    if (lowerError.includes(pattern.toLowerCase())) {
      return message;
    }
  }
  
  // Check for PostgreSQL error codes
  if (lowerError.includes('pgrst') || lowerError.includes('42')) {
    return 'Erro ao processar dados. Tente novamente';
  }
  
  // Check for common technical terms that shouldn't be exposed
  const technicalPatterns = [
    'undefined', 'null', 'syntax', 'parse', 'token',
    'column', 'table', 'schema', 'function', 'trigger',
    'postgresql', 'supabase', 'database', 'sql'
  ];
  
  if (technicalPatterns.some(p => lowerError.includes(p))) {
    return 'Ocorreu um erro. Tente novamente ou contate o suporte';
  }
  
  // If error is too long (likely a stack trace), return generic message
  if (errorMsg.length > 200) {
    return 'Ocorreu um erro. Tente novamente ou contate o suporte';
  }
  
  // Default generic message for truly unknown errors
  return 'Ocorreu um erro. Tente novamente ou contate o suporte';
}

/**
 * Logs errors in development, optionally sends to monitoring in production
 * Safe for server-side logging, never exposes to client
 */
export function logError(error: unknown, context: string): void {
  // Always log in development
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
    return;
  }
  
  // In production, could send to monitoring service (Sentry, etc.)
  // For now, just log a sanitized version
  console.error(`[${context}] Error occurred:`, 
    typeof error === 'string' ? error.substring(0, 100) : 'Non-string error'
  );
}

/**
 * Wraps an async operation with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (err) {
    logError(err, context);
    return { data: null, error: sanitizeError(err) };
  }
}
