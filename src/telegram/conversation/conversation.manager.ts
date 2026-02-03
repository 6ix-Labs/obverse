import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConversationState, ConversationStateDocument } from '../schemas/conversation-state.schema';
// import { ConversationState, ConversationStateDocument } from './conversation-state.schema';

@Injectable()
export class ConversationManager {
  constructor(
    @InjectModel(ConversationState.name)
    private conversationStateModel: Model<ConversationStateDocument>,
  ) { }

  async getState(telegramId: string): Promise<ConversationStateDocument | null> {
    return this.conversationStateModel.findOne({ telegramId });
  }

  async setState(
    telegramId: string,
    merchantId: string,
    command: string,
    step: string,
    data: Record<string, any> = {},
  ): Promise<ConversationStateDocument> {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    return this.conversationStateModel.findOneAndUpdate(
      { telegramId },
      {
        telegramId,
        merchantId: new Types.ObjectId(merchantId),
        currentCommand: command,
        currentStep: step,
        data,
        expiresAt,
      },
      { upsert: true, new: true },
    );
  }

  async updateState(
    telegramId: string,
    step: string,
    data: Record<string, any>,
  ): Promise<ConversationStateDocument | null> {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    return this.conversationStateModel.findOneAndUpdate(
      { telegramId },
      {
        currentStep: step,
        $set: { data },
        expiresAt,
      },
      { new: true },
    );
  }

  async clearState(telegramId: string): Promise<void> {
    await this.conversationStateModel.deleteOne({ telegramId });
  }
}