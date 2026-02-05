# Swagger API Documentation

## ✅ Status: Fully Configured and Working

The Obverse API is fully documented using Swagger/OpenAPI 3.0 specification.

## Access Swagger UI

### Local Development
```
http://localhost:4000/api-docs
```

### Production
```
https://your-domain.com/api-docs
```

## Configuration Overview

### Swagger Setup Location
- **File**: [src/main.ts](src/main.ts#L40-L65)
- **Route**: `/api-docs`
- **JSON Endpoint**: `/api-docs-json`

### Available API Tags

The API is organized into the following categories:

1. **auth** - Authentication endpoints
   - Login, logout, session management

2. **dashboard** - Dashboard endpoints
   - Merchant dashboard data and analytics

3. **payment-links** - Payment link endpoints ⭐ **NEW: OG Images**
   - Create, retrieve, manage payment links
   - Generate OG images for social media previews

4. **payments** - Payment processing endpoints
   - Process payments, verify transactions

5. **transactions** - Transaction management endpoints
   - Transaction history, details, filtering

6. **wallet** - Wallet and balance endpoints
   - Wallet creation, balance queries, wallet management

## Authentication

The API uses JWT Bearer authentication for protected endpoints.

### How to Authenticate in Swagger UI

1. Visit `http://localhost:4000/api-docs`
2. Click the **"Authorize"** button (top right)
3. Enter your JWT token in the format: `Bearer YOUR_TOKEN_HERE`
4. Click **"Authorize"**
5. All authenticated endpoints will now include the token

## Payment Links Endpoints (with OG Images)

### 1. Get Payment Link by Code
```
GET /payment-links/{linkCode}
```

**Smart Response Handling:**
- **Bot/Browser** (User-Agent detection) → Returns HTML with OG meta tags
- **API Client** (Accept: application/json) → Returns JSON data

**Parameters:**
- `linkCode` (path) - Payment link code (e.g., "x7k9m2")

**Response (JSON):**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "linkId": "x7k9m2",
  "merchantId": "507f1f77bcf86cd799439011",
  "amount": 50,
  "token": "USDC",
  "chain": "solana",
  "description": "Payment for consultation services",
  "customFields": [
    {
      "fieldName": "email",
      "fieldType": "email",
      "required": true
    }
  ],
  "isReusable": false,
  "isActive": true,
  "paymentCount": 0,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Response (HTML for Bots):**
```html
<!DOCTYPE html>
<html>
<head>
    <meta property="og:title" content="Payment Request: 50 USDC">
    <meta property="og:image" content="https://obverse.cc/payment-links/x7k9m2/og-image">
    <meta property="og:description" content="Payment for consultation services">
    ...
</head>
<body>
    <!-- Beautiful payment preview page -->
</body>
</html>
```

### 2. Get OG Image for Payment Link
```
GET /payment-links/{linkCode}/og-image
```

**Description:**
Generates a dynamic 1200x630px PNG image with payment details for social media previews.

**Parameters:**
- `linkCode` (path) - Payment link code (e.g., "x7k9m2")

**Response:**
- Content-Type: `image/png`
- Cache-Control: `public, max-age=86400` (24 hours)
- Binary PNG image data

**Features:**
- ✅ Dynamic amount and token display
- ✅ Color-coded by blockchain (Solana green, Ethereum blue, etc.)
- ✅ Shows payment description
- ✅ Chain badge indicator
- ✅ Professional branding

## Testing Swagger Documentation

### Manual Testing

1. **Start the server:**
   ```bash
   pnpm run start:dev
   ```

2. **Open Swagger UI:**
   ```
   http://localhost:4000/api-docs
   ```

3. **Verify all endpoints are visible:**
   - Check that all API tags are present
   - Expand each endpoint to view documentation
   - Test endpoints directly from Swagger UI

### Automated Testing

Run the test script:
```bash
./test-swagger.sh
```

This script validates:
- ✅ Swagger JSON endpoint accessibility
- ✅ Swagger UI accessibility
- ✅ API tags configuration
- ✅ Payment links endpoints documentation
- ✅ OG image endpoint documentation

## Swagger Decorators Used

### Controller Level
```typescript
@ApiTags('payment-links')
@Controller('payment-links')
export class PaymentLinksController { }
```

### Method Level
```typescript
@Get(':linkCode/og-image')
@ApiOperation({
  summary: 'Get OG image for payment link',
  description: 'Generate and retrieve Open Graph image...'
})
@ApiParam({ name: 'linkCode', description: 'Payment link code', example: 'x7k9m2' })
@ApiProduces('image/png')
@ApiResponse({ status: 200, description: 'OG image generated successfully' })
@ApiResponse({ status: 400, description: 'Invalid payment link code format' })
@ApiResponse({ status: 404, description: 'Payment link not found' })
async getOGImage() { }
```

### Response DTOs
```typescript
@ApiResponse({
  status: 200,
  type: PaymentLinkResponseDto,
})
```

## Response DTOs

### PaymentLinkResponseDto
Complete DTO with all fields documented using `@ApiProperty` decorators.

**Location**: [src/payment-links/dto/payment-link-response.dto.ts](src/payment-links/dto/payment-link-response.dto.ts)

**Fields:**
- All payment link properties with descriptions
- Example values for each field
- Type information
- Required/optional indicators

## Customizing Swagger

### Update API Title/Description

Edit [src/main.ts](src/main.ts#L40-L44):
```typescript
const config = new DocumentBuilder()
  .setTitle('Your API Title')
  .setDescription('Your API description')
  .setVersion('1.0')
```

### Add New API Tags

Edit [src/main.ts](src/main.ts#L45-L50):
```typescript
.addTag('new-tag', 'Description of new tag')
```

### Add API Servers

```typescript
const config = new DocumentBuilder()
  .addServer('http://localhost:4000', 'Local Development')
  .addServer('https://api.obverse.cc', 'Production')
  .build();
```

### Add Contact Information

```typescript
const config = new DocumentBuilder()
  .setContact('Support', 'https://obverse.cc', 'support@obverse.cc')
  .setLicense('MIT', 'https://opensource.org/licenses/MIT')
  .build();
```

## Swagger UI Customization

### Custom CSS
Add custom styling to Swagger UI:

```typescript
SwaggerModule.setup('api-docs', app, document, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Obverse API Documentation',
  customfavIcon: '/favicon.ico',
});
```

### Custom Logo
```typescript
SwaggerModule.setup('api-docs', app, document, {
  customCss: `
    .topbar-wrapper img { content: url('/logo.png'); }
  `,
});
```

## Export OpenAPI JSON

To export the Swagger specification as JSON:

```bash
# Start server
pnpm run start

# Download JSON
curl http://localhost:4000/api-docs-json > openapi.json
```

This JSON can be used with:
- Postman (import collection)
- API client generators
- Documentation generators
- API gateways

## Troubleshooting

### Swagger UI Not Loading

**Check 1**: Verify server is running
```bash
curl http://localhost:4000/api-docs
```

**Check 2**: Check for TypeScript errors
```bash
pnpm run build
```

**Check 3**: Verify @nestjs/swagger is installed
```bash
grep "@nestjs/swagger" package.json
```

### Endpoints Not Appearing

**Issue**: Endpoints don't show in Swagger UI

**Solution**: Ensure controllers have `@ApiTags()` decorator
```typescript
@ApiTags('your-tag-name')
@Controller('your-route')
```

### DTOs Not Showing Properties

**Issue**: Response DTOs show as empty objects

**Solution**: Add `@ApiProperty()` to each field
```typescript
export class YourDto {
  @ApiProperty({ description: 'Field description' })
  fieldName: string;
}
```

### Authentication Not Working

**Issue**: JWT auth not sending tokens

**Solution**: Verify Bearer auth is configured
```typescript
.addBearerAuth({ /* config */ }, 'JWT-auth')
```

And use in controllers:
```typescript
@ApiBearerAuth('JWT-auth')
@Get('protected-route')
```

## Best Practices

### 1. Document All Endpoints
Every controller method should have:
- `@ApiOperation()` with summary and description
- `@ApiResponse()` for all possible status codes
- `@ApiParam()` for path parameters
- `@ApiQuery()` for query parameters
- `@ApiBody()` for request bodies

### 2. Use DTOs for Responses
Create dedicated response DTOs with `@ApiProperty()` decorators instead of inline schemas.

### 3. Group Related Endpoints
Use `@ApiTags()` to organize endpoints logically.

### 4. Provide Examples
Include example values in `@ApiProperty()`, `@ApiParam()`, etc.

### 5. Document Error Responses
Always document error responses (400, 401, 404, 500, etc.)

## Integration with Other Tools

### Postman
1. Export OpenAPI JSON: `curl http://localhost:4000/api-docs-json > openapi.json`
2. Import in Postman: **Import → File → openapi.json**

### Code Generators
Generate client SDKs using tools like:
- [OpenAPI Generator](https://openapi-generator.tech/)
- [Swagger Codegen](https://swagger.io/tools/swagger-codegen/)

```bash
# Example: Generate TypeScript client
openapi-generator-cli generate \
  -i http://localhost:4000/api-docs-json \
  -g typescript-axios \
  -o ./client
```

## Summary

✅ **Swagger is fully configured and working**
- All main endpoints documented
- Payment links with OG images fully documented
- Response DTOs created with proper decorators
- Authentication configured
- Test script provided

**Next Steps:**
1. Start server: `pnpm run start:dev`
2. Visit: http://localhost:4000/api-docs
3. Explore and test all endpoints
4. Share documentation with your team

---

**Last Updated**: February 5, 2026
**Version**: 1.0
**Status**: ✅ Production Ready