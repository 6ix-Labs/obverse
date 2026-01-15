import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CoreRepository } from 'src/core/common/repository.core';
import { PaymentLink, PaymentLinkDocument } from './schemas/payment-links.schema';


@Injectable()
export class PaymentlinksRepository extends CoreRepository<PaymentLinkDocument> {
    constructor(
        @InjectModel(PaymentLink.name)
        paymentlink: Model<PaymentLinkDocument>
    ) {
        super(paymentlink)
    }
}