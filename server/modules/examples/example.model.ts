import { Schema, Document, Model, model, Types } from 'mongoose';
import Db from '@aitheon/core-server/dist/config/db';
import { JSONSchema } from 'class-validator-jsonschema';
import { IsString, IsNotEmpty, IsEnum, IsNumber, ValidateNested, IsMongoId, IsDate, IsDefined, IsOptional, Min, IsDateString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

/***
 * Example Type. Data Transfer object type
 */

@JSONSchema({ description: 'File schema' })
export class FileTest {
  @IsMongoId()
  _id: string;
  @IsString()
  name: string;
}


@JSONSchema({ description: 'Example' })
export class Example {

  @IsMongoId()
  @IsOptional()
  _id: string;

  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsOptional()
  @Type(() => Object)
  testAny: any[];

  @IsOptional()
  @JSONSchema({
    items: { type: 'object' },
    type: 'array'
  })
  testArrayAny: any[];

  @IsString()
  @IsOptional()
  organization: string;

  @IsString()
  @IsOptional()
  testModelProp: string;

  @IsOptional()
  createdBy: any;

  @IsDateString()
  @IsOptional()
  createdAt: Date;

  @IsDateString()
  @IsOptional()
  updatedAt: Date;

  @ValidateNested({ each: true })
  @Type(() => FileTest)
  files: any[];

}

/**
 * Database schema/collection
 */
const exampleSchema = new Schema({
  name: String,
  description: String,
  organization: Schema.Types.ObjectId,
  createdBy: Schema.Types.ObjectId
},
{
  timestamps: true,
  collection: 'template__examples'
});

export type IExample = Document & Example;
export const ExampleSchema = Db.connection.model<IExample>('Example', exampleSchema);