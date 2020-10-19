export const COOKIE_MAX_AGE: number = 54e6

export const CORS_ORIGINS: (string | RegExp)[] = [
  /localhost:[0-9]{1,7}$/,
  // your app here
]

export const BODY_PARSER_JSON_LIMIT = '10mb'

export const BODY_PARSER_URL_ENCODED_LIMIT = '20mb'

export const BODY_PARSER_RAW_LIMIT = '20mb'
