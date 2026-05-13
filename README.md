# @cuy-stack/core

A lightweight TypeScript library that provides decorators and utilities for building Express.js applications with a class-based, annotation-driven architecture. Inspired by modern frameworks like NestJS, it enables you to write clean, maintainable, and type-safe API code.

## Features

- 🎯 **Decorator-based routing** - Define routes using `@Controller`, `@Get`, `@Post`, `@Put`, `@Delete` decorators
- 🔌 **Dependency Injection** - Built-in service container with `@Inject` decorator
- 🛡️ **Middleware Support** - Apply middleware at controller and route levels with `@Use` decorator
- 📚 **Route Documentation** - Attach metadata to routes for API documentation generation
- 🔐 **Type-safe** - Full TypeScript support with type definitions included
- 📦 **Zero dependencies** - Minimal footprint with only `reflect-metadata` as a dependency

## Installation

```bash
npm install @cuy-stack/core
# or
yarn add @cuy-stack/core
# or
pnpm add @cuy-stack/core
```

## Requirements

- Node.js 18+
- TypeScript 5.0+
- Express.js (peer dependency for type definitions)

## Quick Start

### 1. Update tsconfig.json

```json
{
  "compilerOptions": {
    "experimentalDecorators": true, // Enable decorator support
    "emitDecoratorMetadata": true
    // ... other options
  }
}
```

### 2. Basic Controller Setup

```typescript
import express, { Request, Response, NextFunction } from 'express';
import { Controller, Get, Post, registerControllers } from '@cuy-stack/core';

@Controller('/users')
class UserController {
  @Get('/')
  getAllUsers(req: Request, res: Response, next: NextFunction) {
    res.json({ users: [] });
  }

  @Post('/')
  createUser(req: Request, res: Response, next: NextFunction) {
    res.status(201).json({ id: 1, name: 'John Doe' });
  }
}

// Initialize Express app
const app = express();
const router = express.Router();

// Register controllers
registerControllers(router, [UserController]);

app.use(router);
app.listen(3000, () => console.log('Server running on port 3000'));
```

### 3. Using Dependency Injection

```typescript
import { Controller, Get, Inject, serviceContainer } from '@cuy-stack/core';

class UserService {
  getUsers() {
    return [{ id: 1, name: 'John' }];
  }
}

@Controller('/users')
class UserController {
  @Inject('userService')
  private userService!: UserService;

  @Get('/')
  getUsers(req: Request, res: Response) {
    const users = this.userService.getUsers();
    res.json(users);
  }
}

// Register service before registering controllers
serviceContainer.register('userService', new UserService());
registerControllers(router, [UserController]);
```

### 4. Using Middleware

```typescript
import { Controller, Get, Use } from '@cuy-stack/core';

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check authentication
  next();
};

// Apply middleware to entire controller
@Controller('/admin', [authMiddleware])
class AdminController {
  @Get('/')
  getDashboard(req: Request, res: Response) {
    res.json({ message: 'Admin dashboard' });
  }
}

// Or apply middleware to specific routes
@Controller('/posts')
class PostController {
  @Use(authMiddleware)
  @Post('/')
  createPost(req: Request, res: Response) {
    res.json({ id: 1, title: 'New Post' });
  }
}
```

### 5. Route Documentation

```typescript
import { Controller, Get, RouteDoc } from '@cuy-stack/core';

@Controller('/api/users')
class UserController {
  @Get('/', {
    summary: 'Get all users',
    description: 'Retrieve a list of all users in the system',
    tags: ['users'],
    response: {
      200: {
        description: 'List of users',
        content: { type: 'array', schema: null },
      },
    },
  })
  getUsers(req: Request, res: Response) {
    res.json([]);
  }
}
```

## API Reference

### Decorators

#### `@Controller(prefix?: string, middlewares?: Middleware[])`

Defines a controller class that handles HTTP requests.

**Parameters:**

- `prefix` (optional): URL prefix for all routes in this controller (e.g., `/users`)
- `middlewares` (optional): Array of middleware functions to apply to all routes

```typescript
@Controller('/api/users', [authMiddleware])
class UserController {}
```

#### `@Get(path: string, documentation?: RouteDoc)`

#### `@Post(path: string, documentation?: RouteDoc)`

#### `@Put(path: string, documentation?: RouteDoc)`

#### `@Delete(path: string, documentation?: RouteDoc)`

Defines route handlers for HTTP methods.

**Parameters:**

- `path`: Route path relative to controller prefix
- `documentation` (optional): Route documentation metadata

```typescript
@Get('/all', { summary: 'Get all items' })
getAllItems(req: Request, res: Response) { }
```

#### `@Use(...middlewares: Middleware[])`

Applies middleware to a controller or specific route handler.

```typescript
@Get('/')
@Use(authMiddleware)
protectedRoute(req: Request, res: Response) { }
```

#### `@Inject(serviceName: string)`

Injects a service registered in the ServiceContainer.

```typescript
@Inject('userService')
private userService!: UserService;
```

### Functions

#### `registerControllers(router: Router, controllers: any[])`

Registers controller classes with an Express router.

```typescript
const router = express.Router();
registerControllers(router, [UserController, PostController]);
app.use(router);
```

#### `getRouteDocumentation()`

Returns documentation for all registered routes.

```typescript
const docs = getRouteDocumentation();
console.log(docs);
```

#### `serviceContainer.register(name: string, service: any)`

Registers a service in the dependency injection container.

```typescript
serviceContainer.register('userService', new UserService());
```

#### `serviceContainer.get<T>(name: string): T`

Retrieves a registered service from the container.

```typescript
const userService = serviceContainer.get<UserService>('userService');
```

## Type Definitions

### `RouteDoc`

Documentation metadata for a route.

```typescript
type RouteDoc = {
  summary: string;
  description: string;
  body?: any;
  auth_strategy?: AuthStrategy | null;
  headers?: Record<string, string>;
  response: Record<number | string, RouteDocResponse>;
  tags: string[];
  params?: Record<string, string>;
  hide?: boolean;
};
```

### `AuthStrategy`

Authentication strategy information.

```typescript
type AuthStrategy = {
  name: string;
  description: string;
  value: Record<string, string>;
};
```

### `RouteDocumentationEntry`

Registered route documentation entry.

```typescript
type RouteDocumentationEntry = {
  method: 'get' | 'post' | 'put' | 'delete';
  path: string;
  handlerName: string;
  documentation: RouteDoc | null;
};
```

## Complete Example

```typescript
import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import {
  Controller,
  Get,
  Post,
  Use,
  Inject,
  registerControllers,
  serviceContainer,
} from '@cuy-stack/core';

// Service layer
class UserService {
  private users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];

  getAll() {
    return this.users;
  }

  getById(id: number) {
    return this.users.find((u) => u.id === id);
  }

  create(name: string) {
    const user = { id: this.users.length + 1, name };
    this.users.push(user);
    return user;
  }
}

// Middleware
const logger = (req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
};

// Controller
@Controller('/users', [logger])
class UserController {
  @Inject('userService')
  private userService!: UserService;

  @Get('/')
  getAll(req: Request, res: Response) {
    const users = this.userService.getAll();
    res.json(users);
  }

  @Get('/:id')
  getById(req: Request, res: Response) {
    const user = this.userService.getById(parseInt(req.params.id));
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  }

  @Post('/')
  create(req: Request, res: Response) {
    const { name } = req.body;
    const user = this.userService.create(name);
    res.status(201).json(user);
  }
}

// Setup
const app = express();
app.use(express.json());

// Register services
serviceContainer.register('userService', new UserService());

// Register routes
const router = express.Router();
registerControllers(router, [UserController]);
app.use(router);

// Start server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

## Build & Development

### Scripts

- `npm run build` - Build the library using tsup (generates CJS and ESM bundles with types)
- `npm run clean` - Remove the dist folder

### Build Output

The library is built with:

- **CommonJS** format: `dist/index.js`
- **ES Modules** format: `dist/index.js`
- **Type definitions**: `dist/index.d.ts`

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or suggestions, please open an issue on the repository.
