import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CoreRepository } from 'src/core/common/repository.core';
import { ConversationState, ConversationStateDocument } from './schemas/conversation-state.schema';

@Injectable()
export class ConversationRepository extends CoreRepository<ConversationStateDocument> {
    constructor(
        @InjectModel(ConversationState.name)
        conversation: Model<ConversationStateDocument>
    ) {
        super(conversation)
    }
}