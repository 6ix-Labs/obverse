import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CoreRepository } from 'src/core/common/repository.core';
import { Payment, PaymentDocument } from './schemas/payments.schema';

@Injectable()
export class PaymentRepository extends CoreRepository<PaymentDocument> {
  constructor(
    @InjectModel(Payment.name)
    payment: Model<PaymentDocument>,
  ) {
    super(payment);
  }
}
