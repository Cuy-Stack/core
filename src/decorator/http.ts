import 'reflect-metadata';
import type { NextFunction, Request, Response, Router } from 'express';

const ROUTES_KEY = Symbol('routes');
const INJECT_KEY = Symbol('inject');
const MIDDLEWARE_KEY = Symbol('middlewares');
const CONTROLLER_MIDDLEWARE_KEY = Symbol('controller_middlewares');

export type RouteDocResponse = {
  description: string;
  content: {
    type: string;
    schema: string | null;
  };
};

export type AuthStrategy = {
  name: string;
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

const routeDocumentationRegistry: RouteDocumentationEntry[] = [];

export type RouteDefinition = {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete';
  handlerName: string;
  documentation?: RouteDoc;
};

type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> | void;
export function Controller(
  prefix: string = '',
  middlewares?: Middleware[],
): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata('prefix', prefix, target);
    if (!Reflect.hasMetadata(ROUTES_KEY, target)) {
      Reflect.defineMetadata(ROUTES_KEY, [], target);
    }

    if (middlewares && middlewares.length > 0) {
      const existing =
        Reflect.getMetadata(CONTROLLER_MIDDLEWARE_KEY, target) || [];
      Reflect.defineMetadata(
        CONTROLLER_MIDDLEWARE_KEY,
        [...existing, ...middlewares],
        target,
      );
    }
  };
}

function createRouteDecorator(method: 'get' | 'post' | 'put' | 'delete') {
  return (path: string, documentation?: RouteDoc): MethodDecorator => {
    return (target, propertyKey) => {
      const routes: RouteDefinition[] =
        Reflect.getMetadata(ROUTES_KEY, target.constructor) || [];

      routes.push({
        method,
        path,
        handlerName: propertyKey as string,
        documentation,
      });

      Reflect.defineMetadata(ROUTES_KEY, routes, target.constructor);
    };
  };
}

export const Get = createRouteDecorator('get');
export const Post = createRouteDecorator('post');
export const Put = createRouteDecorator('put');
export const Delete = createRouteDecorator('delete');

export function Use(...middlewares: any[]): MethodDecorator & ClassDecorator {
  return (target: any, propertyKey?: string | symbol) => {
    if (propertyKey) {
      const existing =
        Reflect.getMetadata(MIDDLEWARE_KEY, target, propertyKey) || [];
      Reflect.defineMetadata(
        MIDDLEWARE_KEY,
        [...existing, ...middlewares],
        target,
        propertyKey,
      );
    } else {
      const existing = Reflect.getMetadata(MIDDLEWARE_KEY, target) || [];
      Reflect.defineMetadata(
        MIDDLEWARE_KEY,
        [...existing, ...middlewares],
        target,
      );
    }
  };
}

class ServiceContainer {
  private services = new Map<string, any>();

  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found`);
    }
    return service;
  }
}

export const serviceContainer = new ServiceContainer();

export function Inject(serviceName: string): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const dependencies =
      Reflect.getMetadata(INJECT_KEY, target.constructor) || [];
    dependencies.push({ propertyKey, serviceName });
    Reflect.defineMetadata(INJECT_KEY, dependencies, target.constructor);
  };
}

function resolveRoutePath(prefix: string, path: string): string {
  const normalizedPrefix = prefix || '';
  const normalizedPath = path || '';
  const merged = `${normalizedPrefix}${normalizedPath}`;

  if (!merged) return '/';
  return merged.startsWith('/') ? merged : `/${merged}`;
}

export function getRouteDocumentation(): RouteDocumentationEntry[] {
  return routeDocumentationRegistry.map((doc) => ({
    ...doc,
    documentation: doc.documentation ? { ...doc.documentation } : null,
  }));
}

export function registerControllers(router: Router, controllers: any[]) {
  routeDocumentationRegistry.length = 0;

  controllers.forEach((ControllerClass) => {
    const instance = new ControllerClass();

    const dependencies = Reflect.getMetadata(INJECT_KEY, ControllerClass) || [];
    dependencies.forEach(({ propertyKey, serviceName }: any) => {
      const service = serviceContainer.get(serviceName);
      (instance as any)[propertyKey] = service;
    });

    const prefix = Reflect.getMetadata('prefix', ControllerClass) || '';
    const routes: RouteDefinition[] =
      Reflect.getMetadata(ROUTES_KEY, ControllerClass) || [];
    const classMiddlewares =
      Reflect.getMetadata(MIDDLEWARE_KEY, ControllerClass) || [];

    const controllerMiddlewares =
      Reflect.getMetadata(CONTROLLER_MIDDLEWARE_KEY, ControllerClass) || [];

    routes.forEach((route) => {
      const fullPath = resolveRoutePath(prefix, route.path);

      routeDocumentationRegistry.push({
        method: route.method,
        path: fullPath,
        handlerName: route.handlerName,
        documentation: route.documentation || null,
      });

      const routeMiddlewares =
        Reflect.getMetadata(MIDDLEWARE_KEY, instance, route.handlerName) || [];

      const handler = (instance as any)[route.handlerName].bind(instance);

      router[route.method](
        fullPath,
        ...controllerMiddlewares,
        ...classMiddlewares,
        ...routeMiddlewares,
        handler,
      );
    });
  });

  console.log(
    `Registered ${routeDocumentationRegistry.length} routes from ${controllers.length} controllers.`,
  );
}
