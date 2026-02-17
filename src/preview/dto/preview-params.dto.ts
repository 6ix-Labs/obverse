import { IsMongoId, IsString, Length } from 'class-validator';

export class LinkPreviewParamsDto {
  @IsString()
  @Length(6, 20)
  linkCode: string;
}

export class ReceiptPreviewParamsDto {
  @IsMongoId()
  paymentId: string;
}

export class DashboardPreviewParamsDto {
  @IsMongoId()
  dashboardId: string;
}
