import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CoreRepository } from 'src/core/common/repository.core';
import { Merchant, MerchantDocument } from './schema/merchant.schema';

@Injectable()
export class MerchantRepository extends CoreRepository<MerchantDocument> {
  constructor(
    @InjectModel(Merchant.name)
    merchantModel: Model<MerchantDocument>,
  ) {
    super(merchantModel);
  }
}
