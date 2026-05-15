export type RouteDocResponse = {
  description: string;
  content: {
    type: string;
    schema: string | null;
  };
};

export type AuthStrategy = {
  name: 'header' | 'cookie';
  description: string;
  value: Record<string, string>;
};

export type RouteDoc = {
  summary: string;
  description: string;
  body: any;
  auth_strategy?: AuthStrategy | null;
  headers?: Record<string, string>;
  response: Record<number | string, RouteDocResponse>;
  tags: string[];
  params?: Record<string, string>;
  hide?: boolean;
};

export type RouteDocumentationEntry = {
  method: 'get' | 'post' | 'put' | 'delete';
  path: string;
  handlerName: string;
  documentation: RouteDoc | null;
};

export type RouteDefinition = {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete';
  handlerName: string;
  documentation?: RouteDoc;
};
