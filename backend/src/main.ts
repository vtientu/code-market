import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';

// Validate an origin string: must be parseable URL, https in prod, no path/query.
const validateOrigin = (raw: string, isProd: boolean, label: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${label} is not a valid URL: ${raw}`);
  }
  if (isProd && parsed.protocol !== 'https:') {
    throw new Error(`${label} must use https in production: ${raw}`);
  }
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new Error(`${label} must be an origin (no path): ${raw}`);
  }
  return parsed.origin;
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Middleware
  app.use(cookieParser());

  const isProd = process.env['NODE_ENV'] === 'production';
  const cmsUrl = process.env['CMS_URL'];
  const frontendUrl = process.env['FRONTEND_URL'];
  if (isProd && (!cmsUrl || !frontendUrl)) {
    throw new Error('CMS_URL and FRONTEND_URL must be set in production');
  }
  const allowedOrigins = [
    validateOrigin(cmsUrl ?? 'http://localhost:5173', isProd, 'CMS_URL'),
    validateOrigin(frontendUrl ?? 'http://localhost:3001', isProd, 'FRONTEND_URL'),
  ];
  logger.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global pipes, filters, interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Code Market API')
    .setDescription(
      'API for the Code Market platform — buy and sell source code projects',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env['PORT'] ?? 3000);
}

void bootstrap();
