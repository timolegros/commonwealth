import 'modals/simple_input_modal.scss';

import $ from 'jquery';
import m from 'mithril';

import app from 'state';
import { Button, Input } from 'construct-ui';
import { CompactModalExitButton } from '../modal';

const SimpleInputModal = {
  view: (vnode) => {
    const { callback, title } = vnode.attrs;
    return m('.SimpleInputModal', [
      m('.compact-modal-title', [
        title && m('h3', title),
        m(CompactModalExitButton),
      ]),
      m('.compact-modal-body', [
        m(Input, {
          fluid: true
        })
      ]),
      m('.compact-modal-actions', [
        m(Button, {
          type: 'submit',
          onclick: callback,
          fluid: true,
          label: 'Save title',
          intent: 'primary',
        }),
      ]),
    ]);
  }
};

export default SimpleInputModal;
