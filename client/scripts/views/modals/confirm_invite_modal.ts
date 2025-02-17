import 'modals/confirm_invite_modal.scss';

import m from 'mithril';
import $ from 'jquery';
import app from 'state';
import mixpanel from 'mixpanel-browser';
import { Button, Icon, Icons } from 'construct-ui';

import { orderAccountsByAddress } from 'helpers';
import { notifyError } from 'controllers/app/notifications';
import User, { UserBlock } from 'views/components/widgets/user';
import { CompactModalExitButton } from 'views/modal';
import { confirmationModalWithText } from 'views/modals/confirm_modal';
import { initAppState, navigateToSubpage } from 'app';

const SideMenu: m.Component<{invites, onChangeHandler, location}, {}> = {
  view: (vnode) => {
    const { location } = vnode.attrs;
    return m('.SideMenu', [
      vnode.attrs.invites.map((invite, index) => {
        return m('.inviteTitle', {
          class: (location === index) ? 'selected' : '',
          onclick: () => {
            vnode.attrs.onChangeHandler(index);
          }
        }, `${invite.community_name}`);
      })
    ]);
  },
};

const ConfirmInviteModal: m.Component<{}, {
  invites;
  location;
  isComplete;
  selectedAddress;
  addresses;
  accepted;
  rejected;
}> = {
  oninit: (vnode) => {
    vnode.state.invites = app.config.invites;
    vnode.state.location = 0;
    vnode.state.isComplete = false;
    vnode.state.selectedAddress = null;
    vnode.state.addresses = app.user.addresses;
    vnode.state.accepted = [];
    vnode.state.rejected = [];
  },
  oncreate: (vnode) => {
    mixpanel.track('Accepting Invite', {
      'Step No': 1,
      'Step': 'Modal Opened',
    });
  },
  view: (vnode) => {
    const SelectAddress = (account) => {
      return m('.SwitchAddress.account-menu-item', {
        key: `${account.chain.id}-${account.address}`,
        class: vnode.state.selectedAddress === account.address ? 'selected' : '',
        onclick: (e) => {
          e.preventDefault();
          vnode.state.selectedAddress = account.address;
        },
      }, [
        m(UserBlock, { user: account, showChainName: true })
      ]);
    };

    const { invites, location } = vnode.state;
    let addresses;
    if (vnode.state.accepted.length + vnode.state.rejected.length === invites.length) {
      vnode.state.isComplete = true;
    } else {
      addresses = (vnode.state.addresses || [])
        .sort(orderAccountsByAddress)
        .map((account) => SelectAddress(account));
    }

    const activeInvite = invites[location].community_id
      ? app.config.communities.getById(invites[location].community_id)
      : app.config.chains.getById(invites[location].chain_id);
    const hasTermsOfService = !!activeInvite?.terms;

    return m('.ConfirmInviteModal', [
      m('.compact-modal-title', [
        !vnode.state.isComplete
          ? m('h3', 'Manage Invites')
          : m('h3', 'No more invites'),
        m(CompactModalExitButton),
      ]),
      !vnode.state.isComplete
        && m(SideMenu, {
          invites,
          location,
          onChangeHandler: (result) => { vnode.state.location = result; vnode.state.selectedAddress = null; }
        }),
      invites.length > 0 && !vnode.state.isComplete
        ? m('.compact-modal-body', [
          m('p', [
            'You\'ve been invited to the ',
            m('strong', invites[location].community_name),
            ' community. Select an address to accept the invite:'
          ]),
          hasTermsOfService
          && m('p.terms-of-service', [
            `By linking an address, you agree to ${activeInvite.name}'s `,
            m('a', { href: activeInvite.terms, target: '_blank' }, 'terms of service'),
            '.'
          ]),
          vnode.state.accepted.includes(location) ? m('h4', 'You\'ve accepted this invite!')
            : vnode.state.rejected.includes(location) ? m('h4', 'You\'ve already deleted this invite!') : [
              m('.invite-addresses', [
                addresses,
              ]),
              addresses.length > 0 && m('.invite-actions', [
                m(Button, {
                  class: 'submit',
                  intent: 'primary',
                  rounded: true,
                  disabled: vnode.state.accepted.includes(location) || !vnode.state.selectedAddress,
                  onclick: (e) => {
                    e.preventDefault();
                    if (vnode.state.selectedAddress) {
                      app.user.acceptInvite({
                        address: vnode.state.selectedAddress,
                        inviteCode: invites[location].id
                      }).then(() => {
                        app.config.invites = app.config.invites.filter(
                          (invite) => invite.community_name !== invites[location].community_name
                        );
                        vnode.state.accepted.push(location);
                        vnode.state.selectedAddress = null;
                        mixpanel.track('Address Selected', {
                          'Step': 'Address Selected for Invite',
                        });
                        if (app.config.invites.length === 0) {
                          $(e.target).trigger('modalexit');
                        }
                        const communityId = invites[location].community_id;
                        const chainId = invites[location].chain_id;
                        console.log({ communityId, chainId });
                        // if private community, re-init app
                        if (communityId && !app.config.communities.getByCommunity(communityId)) {
                          initAppState().then(() => m.route.set(`/${communityId}`));
                        } else {
                          m.route.set(`/${communityId || chainId}`);
                        }
                      }, (err) => {
                        notifyError('Error accepting invite');
                      });
                    }
                  },
                  label: 'Accept invite',
                }),
                m('.invite-actions-or', 'or'),
                m(Button, {
                  class: 'reject',
                  intent: 'negative',
                  rounded: true,
                  disabled: vnode.state.accepted.includes(location),
                  onclick: async (e) => {
                    e.preventDefault();
                    const confirmed = await confirmationModalWithText(
                      'Reject this invite? You will need to be invited again.'
                    )();
                    if (!confirmed) return;
                    $.post(`${app.serverUrl()}/acceptInvite`, {
                      inviteCode: invites[location].id,
                      reject: true,
                      jwt: app.user.jwt,
                    }).then((result) => {
                      app.config.invites = app.config.invites.filter(
                        (invite) => invite.community_name !== invites[location].community_name
                      );
                      vnode.state.rejected.push(location);
                      vnode.state.selectedAddress = null;
                      m.redraw();
                    }, (err) => {
                      notifyError('Error rejecting invite.');
                    });
                  },
                  label: 'Reject invite'
                }),
              ]),
              addresses.length === 0 && m('a.btn.add-account', {
                href: '#',
                onclick: (e) => {
                  e.preventDefault();

                  // set defaults for the web3 login modal
                  // TODO: let the user select between different crypto wallets for linking an address
                  const defaultChainId = 'edgeware';
                  const joiningCommunity = invites[vnode.state.location].community_id;
                  const targetCommunity = joiningCommunity;
                  const prev = m.route.get();
                  const next = `/${joiningCommunity}`;
                  // TODO: implement joiningChain once confirm_invite_modal supports chains
                  const web3loginParams = joiningCommunity ? { prev, next, joiningCommunity } : { prev, next };

                  // redirect to /web3login to connect to the chain
                  if (app.activeId()) {
                    navigateToSubpage('/web3login', web3loginParams);
                  } else {
                    m.route.set(`${defaultChainId}/web3login`, web3loginParams);
                  }

                  // show web3 login modal
                  app.modals.lazyCreate('link_new_address_modal', {
                    joiningCommunity,
                    targetCommunity,
                    successCallback: () => {
                      m.route.set(next);
                      $(e.target).trigger('modalexit');
                    }
                  });
                }
              }, 'Connect a new address'),
            ],
        ])
        : m('.compact-modal-body', [
          m('div', [
            m('p', 'No more invites!'),
            m('p', 'Click anywhere outside this window to close it.'),
          ]),
        ])
    ]);
  }
};

export default ConfirmInviteModal;
