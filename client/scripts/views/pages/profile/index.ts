import 'pages/profile.scss';

import m from 'mithril';
import moment from 'moment';
import _ from 'lodash';
import mixpanel from 'mixpanel-browser';
import $ from 'jquery';
import Web3 from 'web3';

import app from 'state';
import { OffchainThread, OffchainComment, Profile, ChainBase, AddressInfo } from 'models';

import Sublayout from 'views/sublayout';
import PageNotFound from 'views/pages/404';
import PageLoading from 'views/pages/loading';
import Tabs from 'views/components/widgets/tabs';

import { decodeAddress, checkAddress, encodeAddress } from '@polkadot/util-crypto';
import { setActiveAccount } from 'controllers/app/login';
import ProfileHeader from './profile_header';
import ProfileContent from './profile_content';
import ProfileBio from './profile_bio';
import ProfileBanner from './profile_banner';

const getProfileStatus = (chain: string, address: string, id?: number): {
  onOwnProfile: boolean,
  onLinkedProfile: boolean,
  displayBanner: boolean,
  currentAddressInfo: AddressInfo,
} => {
  const onOwnProfile = typeof app.user.activeAccount?.chain === 'string'
    ? (chain === app.user.activeAccount?.chain && address === app.user.activeAccount?.address)
    : (chain === app.user.activeAccount?.chain?.id && address === app.user.activeAccount?.address);
  const onLinkedProfile = !onOwnProfile && app.user.activeAccounts.length > 0
    && app.user.activeAccounts.filter((account_) => {
      return app.user.getRoleInCommunity({
        account: account_,
        chain: app.activeChainId(),
      });
    }).filter((account) => {
      return account.address === address;
    }).length > 0;

  console.log(`onOwnProfile: ${onOwnProfile}, onLinkedProfile: ${onLinkedProfile}`);

  // if the profile that we are visiting is in app.activeAddresses() but not the current active address,
  // then display the ProfileBanner
  // TODO: display the banner if the current address is in app.activeAddresses() and *is* a member of the
  // community (this will require alternate copy on the banner)
  let isUnjoinedJoinableAddress: boolean;
  let currentAddressInfo: AddressInfo;
  if (!onOwnProfile && !onLinkedProfile) {
    const communityOptions = { chain: app.activeChainId(), community: app.activeCommunityId() };
    const communityRoles = app.user.getAllRolesInCommunity(communityOptions);
    const joinableAddresses = app.user.getJoinableAddresses(communityOptions);
    const unjoinedJoinableAddresses = (joinableAddresses.length > communityRoles.length)
      ? joinableAddresses.filter((addr) => {
        return communityRoles.filter((role) => {
          return role.address_id === addr.id;
        }).length === 0;
      })
      : [];
    const currentAddressInfoArray = unjoinedJoinableAddresses.filter((addr) => {
      return id && addr.id === id;
    });
    isUnjoinedJoinableAddress = currentAddressInfoArray.length > 0;
    if (isUnjoinedJoinableAddress) {
      currentAddressInfo = currentAddressInfoArray[0];
    }
  }

  return ({
    onOwnProfile,
    onLinkedProfile,
    displayBanner: isUnjoinedJoinableAddress,
    currentAddressInfo
  });
};

export enum UserContent {
  All = 'posts',
  Threads = 'threads',
  Comments = 'comments'
}

interface IProfilePageState {
  profile: Profile;
  threads: OffchainThread[];
  comments: OffchainComment<any>[];
  addressId?: number;
  loaded: boolean;
  loading: boolean;
  refreshProfile: boolean;
}

const ProfilePage: m.Component<{ address: string, setIdentity?: boolean }, IProfilePageState> = {
  oninit: (vnode) => {
    vnode.state.profile = null;
    vnode.state.loaded = false;
    vnode.state.loading = false;
    vnode.state.threads = [];
    vnode.state.comments = [];
    vnode.state.refreshProfile = false;

    const chain = (m.route.param('base'))
      ? m.route.param('base')
      : m.route.param('scope');
    const { address } = vnode.attrs;
    const chainInfo = app.config.chains.getById(chain);
    const baseSuffix = m.route.param('base');

    if (chainInfo?.base === ChainBase.Substrate) {
      const decodedAddress = decodeAddress(address);
      const ss58Prefix = parseInt(chainInfo.ss58Prefix, 10);

      const [valid] = checkAddress(address, ss58Prefix);
      if (!valid) {
        try {
          const encoded = encodeAddress(decodedAddress, ss58Prefix);
          m.route.set(`/${m.route.param('scope')}/account/${encoded}${baseSuffix ? `?base=${baseSuffix}` : ''}`);
        } catch (e) {
          // do nothing if can't encode address
          console.error(`Invalid substrate address: ${address}`);
        }
      }
    } else if (chainInfo?.base === ChainBase.Ethereum) {
      const valid = Web3.utils.checkAddressChecksum(address);

      if (!valid) {
        try {
          const checksumAddress = Web3.utils.toChecksumAddress(address);
          m.route.set(`/${m.route.param('scope')}/account/${checksumAddress}${baseSuffix ? `?base=${baseSuffix}` : ''}`);
        } catch (e) {
          // do nothing if can't get checksumAddress
          console.error(`Can't get checksum address for: ${address}`);
        }
      }
    }
  },
  oncreate: async (vnode) => {
    mixpanel.track('PageVisit', { 'Page Name': 'LoginPage' });
  },
  view: (vnode) => {
    const loadProfile = async () => {
      const chain = (m.route.param('base'))
        ? m.route.param('base')
        : m.route.param('scope');
      const { address } = vnode.attrs;
      const chainInfo = app.config.chains.getById(chain);
      let valid = false;

      if (chainInfo?.base === ChainBase.Substrate) {
        const ss58Prefix = parseInt(chainInfo.ss58Prefix, 10);
        [valid] = checkAddress(address, ss58Prefix);
      } else if (chainInfo?.base === ChainBase.Ethereum) {
        valid = Web3.utils.checkAddressChecksum(address);
      }
      if (!valid) {
        return;
      }
      vnode.state.loading = true;
      const { addressId, profile, threads, comments } = await app.profiles.getProfileWithActivity(chain, address);
      vnode.state.profile = profile;
      vnode.state.threads = threads;
      vnode.state.comments = comments;
      vnode.state.addressId = addressId;
      vnode.state.loaded = true;
      vnode.state.loading = false;
      m.redraw();
    };

    const { setIdentity } = vnode.attrs;
    const { profile, loaded, loading, refreshProfile } = vnode.state;
    if (!loading && !loaded) {
      loadProfile();
    }
    if (loading || !app.chain?.accounts) return m(PageLoading, { showNewProposalButton: true });
    if (!profile) {
      return m(PageNotFound, { message: 'Invalid address provided' });
    }

    const account = app.chain.accounts.get(profile.address);
    console.log(account);

    const { onOwnProfile, onLinkedProfile, displayBanner, currentAddressInfo } = getProfileStatus(
      profile.chain,
      profile.address,
      vnode.state.addressId,
    );

    if (refreshProfile) {
      vnode.state.refreshProfile = false;
      loadProfile();
    }

    // TODO: search for cosmos proposals, if ChainClass is Cosmos
    const comments = vnode.state.comments
      .sort((a, b) => +b.createdAt - +a.createdAt);
    const proposals = vnode.state.threads
      .sort((a, b) => +b.createdAt - +a.createdAt);
    const allContent = [].concat(proposals || []).concat(comments || [])
      .sort((a, b) => +b.createdAt - +a.createdAt);

    const allTabTitle = (proposals && comments) ? `All (${proposals.length + comments.length})` : 'All';
    const threadsTabTitle = (proposals) ? `Threads (${proposals.length})` : 'Threads';
    const commentsTabTitle = (comments) ? `Comments (${comments.length})` : 'Comments';

    return m(Sublayout, {
      class: 'ProfilePage',
      showNewProposalButton: true,
    }, [
      m('.forum-container-alt', [
        displayBanner
        && m(ProfileBanner, {
          account,
          addressInfo: currentAddressInfo
        }),
        m(ProfileHeader, {
          account,
          setIdentity,
          onOwnProfile,
          onLinkedProfile,
          refreshCallback: () => { vnode.state.refreshProfile = true; },
        }),
        m('.row.row-narrow.forum-row', [
          m('.col-xs-8', [
            m(Tabs, [{
              name: allTabTitle,
              content: m(ProfileContent, {
                account,
                type: UserContent.All,
                content: allContent,
                localStorageScrollYKey: `profile-${vnode.attrs.address}-${m.route.param('base')}-${app.activeId()}-scrollY`,
              })
            }, {
              name: threadsTabTitle,
              content: m(ProfileContent, {
                account,
                type: UserContent.Threads,
                content: proposals,
                localStorageScrollYKey: `profile-${vnode.attrs.address}-${m.route.param('base')}-${app.activeId()}-scrollY`,
              }),
            }, {
              name: commentsTabTitle,
              content: m(ProfileContent, {
                account,
                type: UserContent.Comments,
                content: comments,
                localStorageScrollYKey: `profile-${vnode.attrs.address}-${m.route.param('base')}-${app.activeId()}-scrollY`,
              }),
            }]),
          ]),
          m('.col-xs-4', [
            m(ProfileBio, { account }),
          ]),
        ]),
      ]),
    ]);
  },
};

export default ProfilePage;
