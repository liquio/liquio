import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { Orientation, PdfGenerationOptions } from '@modules/pdf/pdf.types';

class BorderDto {
  @IsString()
  @IsOptional()
  top?: string;

  @IsString()
  @IsOptional()
  right?: string;

  @IsString()
  @IsOptional()
  bottom?: string;

  @IsString()
  @IsOptional()
  left?: string;
}

class PdfGenerationOptionsDto {
  @IsNumber()
  @IsOptional()
  timeout?: number;

  @IsString()
  @IsOptional()
  format?: string;

  @IsString()
  @IsOptional()
  orientation?: Orientation;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => BorderDto)
  border?: BorderDto;

  @IsOptional()
  @IsString()
  width: string;

  @IsOptional()
  @IsString()
  height: string;
}

export class GeneratePdfDto {
  @IsString()
  @IsNotEmpty()
  html: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PdfGenerationOptionsDto)
  options?: PdfGenerationOptions;

  constructor() {
    this.options = this.options || {};
  }
}
