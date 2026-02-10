import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './core/filters/exception/http.exception';
import { ModelExceptionFilter } from './core/filters/exception/model.exception';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    app.enableCors({
      origin: ['http://localhost:3000', 'https://www.obverse.cc'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    });

    // Enable validation with detailed error messages
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        errorHttpStatusCode: 400,
      }),
    );

    // Register global exception filters
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalFilters(new ModelExceptionFilter());

    // Setup Swagger Documentation
    const config = new DocumentBuilder()
      .setTitle('Obverse API')
      .setDescription('API documentation for Obverse payment platform')
      .setVersion('1.0')
      .addTag('auth', 'Authentication endpoints')
      .addTag('dashboard', 'Dashboard endpoints')
      .addTag('payment-links', 'Payment link endpoints')
      .addTag('payments', 'Payment processing endpoints')
      .addTag('transactions', 'Transaction management endpoints')
      .addTag('wallet', 'Wallet and balance endpoints')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);

    const port = process.env.PORT || 4000;
    await app.listen(port);

    logger.log(
      `Swagger documentation available at: http://localhost:${port}/api-docs`,
    );

    logger.log(`Application is running on: http://localhost:${port}`);
  } catch (error) {
    logger.error('Error starting application:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application:', error);
  process.exit(1);
});
