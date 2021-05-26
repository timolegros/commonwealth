import 'pages/loading.scss';

import $ from 'jquery';
import m from 'mithril';
import { Spinner } from 'construct-ui';
import Sublayout from 'views/sublayout';

const LoadingPage: m.Component<{
  title?,
  message?: string,
  showTimer?: boolean,
  narrow?: boolean,
  showNewProposalButton?: boolean
}, {
  timerHandle,
  timerStarted: number,
}> = {
  oninit: (vnode) => {
    vnode.state.timerStarted = +new Date();
    vnode.state.timerHandle = setInterval(() => {
      m.redraw();
    }, 200);
  },
  onremove: (vnode) => {
    clearInterval(vnode.state.timerHandle);
  },
  view: (vnode) => {
    const { title, message, showTimer, narrow, showNewProposalButton } = vnode.attrs;
    const timerText = `${Math.round((+new Date() - vnode.state.timerStarted) / 1000)}s`;

    return m(Sublayout, {
      class: 'LoadingPage',
      title,
      showNewProposalButton,
      hideSearch: true,
    }, [
      m(Spinner, {
        fill: true,
        message: !showTimer ? message : `${message} ${timerText}`,
        size: 'xl',
        style: 'visibility: visible; opacity: 1;'
      }),
    ]);
  }
};

export default LoadingPage;
