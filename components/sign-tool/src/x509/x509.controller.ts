import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';

import { X509Service } from './x509.service';

// --- DTOs ---
class GetSignatureInfoDto {
  @ApiProperty({ description: 'Base64-encoded CMS/PKCS#7 signature' })
  sign: string;
}

class GetSignatureInfoSigner {
  @ApiProperty()
  commonName: string;

  @ApiPropertyOptional()
  surname?: string;

  @ApiPropertyOptional()
  givenName?: string;

  @ApiPropertyOptional()
  organizationName?: string;

  @ApiPropertyOptional()
  organizationIdentifier?: string;

  @ApiPropertyOptional()
  countryName?: string;

  @ApiPropertyOptional()
  localityName?: string;

  @ApiPropertyOptional()
  personIdentifier?: string;
}

class GetSignatureInfoIssuer {
  @ApiProperty()
  commonName: string;

  @ApiPropertyOptional()
  organizationName?: string;

  @ApiPropertyOptional()
  organizationIdentifier?: string;

  @ApiPropertyOptional()
  countryName?: string;

  @ApiPropertyOptional()
  localityName?: string;
}

class GetSignatureInfoResponse {
  @ApiProperty({ type: GetSignatureInfoSigner })
  subject: GetSignatureInfoSigner;

  @ApiProperty({ type: GetSignatureInfoIssuer })
  issuer: GetSignatureInfoIssuer;

  @ApiProperty()
  serial: string;

  @ApiProperty()
  signTime: string;

  @ApiPropertyOptional()
  content?: string;

  @ApiPropertyOptional()
  pem?: string;
}

class VerifyHashDto {
  @ApiProperty({ description: 'Base64-encoded hash' })
  hash: string;

  @ApiProperty({ description: 'Base64-encoded signature' })
  sign: string;
}

class HashDataDto {
  @ApiProperty({ description: 'Base64-encoded data' })
  data: string;

  @ApiPropertyOptional({ description: 'Need to return data in base64' })
  isReturnAsBase64?: boolean;
}

class HashToInternalSignatureDto {
  @ApiProperty({ description: 'Base64-encoded hash' })
  hash: string;

  @ApiPropertyOptional({ description: 'Base64-encoded content' })
  content?: string;
}

@ApiTags('X.509')
@Controller('x509')
export class X509Controller {
  constructor(private x509: X509Service) {}

  @Post('/signature-info')
  @ApiOperation({
    summary: 'Get signature information',
    description: 'Extracts information from the signature (eIDAS compatible)',
  })
  @ApiCreatedResponse({
    description: 'Signature information package has been successfully created',
    type: GetSignatureInfoResponse,
  })
  async getSignatureInfo(
    @Body() { sign }: GetSignatureInfoDto,
  ): Promise<GetSignatureInfoResponse> {
    if (!sign) {
      throw new BadRequestException('Sign is required');
    }
    try {
      // Service method will be implemented to use pkijs/asn1js
      return await this.x509.getSignatureInfo(sign);
    } catch (e) {
      throw new BadRequestException('Invalid signature data', {
        cause: e.message,
      });
    }
  }

  @Post('/verify-hash')
  @ApiOperation({
    summary: 'Verify hash',
    description: 'Verifies the hash with the signature',
  })
  @ApiCreatedResponse({
    description: 'Hash has been successfully verified',
    type: Boolean,
  })
  async verifyHash(
    @Body() { hash, sign }: VerifyHashDto,
  ): Promise<{ result: boolean }> {
    let result = false;
    try {
      result = Boolean(await this.x509.verifyHash(hash, sign));
    } catch {
      // Do nothing
    }
    return { result };
  }

  @Post('/hash-data')
  @ApiOperation({
    summary: 'Hash data',
    description: 'Hashes the data',
  })
  @ApiCreatedResponse({
    description: 'Data has been successfully hashed',
    type: String,
  })
  async hashData(
    @Body() { data, isReturnAsBase64 }: HashDataDto,
  ): Promise<string> {
    if (!data) {
      throw new BadRequestException('Data is required');
    }
    try {
      return await this.x509.hashData(data, isReturnAsBase64);
    } catch (e) {
      throw new BadRequestException(
        'Invalid data, expected base64-encoded string',
        { cause: e.message },
      );
    }
  }

  @Post('/hash-to-internal-signature')
  @ApiOperation({
    summary: 'Hash to internal signature',
    description: 'Converts the hash to internal signature',
  })
  @ApiCreatedResponse({
    description: 'Hash has been successfully converted to internal signature',
    type: String,
  })
  async hashToInternalSignature(
    @Body() { hash, content }: HashToInternalSignatureDto,
  ): Promise<string> {
    if (!hash) {
      throw new BadRequestException('Hash is required');
    }
    try {
      return await this.x509.hashToInternalSignature(hash, content);
    } catch (e) {
      throw new BadRequestException('Invalid hash or content data', {
        cause: e.message,
      });
    }
  }
}
