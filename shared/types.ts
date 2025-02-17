import { Model, BuildOptions } from 'sequelize';
// This is a const and not an enum because of a weird webpack error.
// It has the same syntax, though, so it should be OK, as long as we don't
// modify any of the values.
// eslint-disable-next-line import/prefer-default-export
export const NotificationCategories = {
  NewComment: 'new-comment-creation',
  NewThread: 'new-thread-creation',
  NewCommunity: 'new-community-creation',
  NewRoleCreation: 'new-role-creation',
  NewMention: 'new-mention',
  NewReaction: 'new-reaction',
  NewCollaboration: 'new-collaboration',
  ThreadEdit: 'thread-edit',
  CommentEdit: 'comment-edit',
  ChainEvent: 'chain-event',
  EntityEvent: 'entity-event',
};

export enum ProposalType {
  SubstrateDemocracyReferendum = 'referendum',
  SubstrateDemocracyProposal = 'democracyproposal',
  SubstrateCollectiveProposal = 'councilmotion',
  PhragmenCandidacy = 'phragmenelection',
  SubstrateTreasuryProposal = 'treasuryproposal',
  OffchainThread = 'discussion',
  CosmosProposal = 'cosmosproposal',
  MolochProposal = 'molochproposal',
  AaveProposal = 'aaveproposal',
  MarlinProposal = 'marlinproposal',
}

export enum WebsocketEventType {
  Connection = 'connection',
  Message = 'message',
  Upgrade = 'upgrade',
  Close = 'close',
}

export enum WebsocketMessageType {
  Message = 'message',
  Heartbeat = 'heartbeat',
  HeartbeatPong = 'heartbeat-pong',
  InitializeScrollback = 'scrollback',
  Typing = 'typing',
  Notification = 'notification',
  ChainEntity = 'chain-entity',
}

export interface IWebsocketsPayload<T> {
  event: WebsocketMessageType;
  jwt?: string; // for outgoing payloads
  chain?: string; // for incoming payloads
  address?: string; // for incoming payloads
  data?: T;
}

export interface IPostNotificationData {
  created_at: any;
  root_id: string;
  root_title: string;
  root_type: string;
  comment_id?: number;
  comment_text?: string;
  parent_comment_id?: number;
  parent_comment_text?: string;
  chain_id: string;
  community_id: string;
  author_address: string;
  author_chain: string;
}

export interface ICommunityNotificationData {
  created_at: any;
  role_id: string | number;
  author_address: string;
  chain: string;
  community: string;
}

export interface IChainEventNotificationData {
  chainEvent: any;
  chainEventType: any;
}

export const PROFILE_NAME_MAX_CHARS = 40;
export const PROFILE_HEADLINE_MAX_CHARS = 80;
export const PROFILE_BIO_MAX_CHARS = 1000;
export const PROFILE_NAME_MIN_CHARS = 3;

export const DynamicTemplate = {
  ImmediateEmailNotification: 'd-3f30558a95664528a2427b40292fec51',
  BatchNotifications: 'd-468624f3c2d7434c86ae0ed0e1d2227e',
  SignIn: 'd-db52815b5f8647549d1fe6aa703d7274',
  SignUp: 'd-2b00abbf123e4b5981784d17151e86be',
  EmailInvite: 'd-000c08160c07459798b46c927b638b9a',
  UpdateEmail: 'd-a0c28546fecc49fb80a3ba9e535bff48',
  VerifyAddress: 'd-292c161f1aec4d0e98a0bf8d6d8e42c2',
};

export type TokenResponse = {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
};
