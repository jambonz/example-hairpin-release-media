const service = ({logger, makeService}) => {
  const svc = makeService({path: '/hairpin'});

  svc.on('session:new', (session) => {
    const {to, call_sid} = session;
    session.locals = {logger: logger.child({call_sid})};
    logger.info({session}, `new incoming call: ${session.call_sid}`);

    /* copy custom headers from inbound call */
    const headers = {};
    [
      'p-rc-int-call-type',
      'p-rc-int-user-id',
      'p-rc-account-info'
    ].forEach((h) => {
      if (session.sip.headers[h]) {
        headers[h] = session.sip.headers[h];
      }
    });

    try {
      session
        .on('close', onClose.bind(null, session))
        .on('error', onError.bind(null, session));

      session
        .answer()
        .pause({length: 1.0})
        .say({text: 'please hold while we connect you back to Ring Central'})
        .dial({
          //timeLimit: 10,
          //exitMediaPath: true,
          anchorMedia: true,
          target: [{
            type: 'phone',
            number: to
          }],
          headers
        })
        .say({text: 'And welcome back to jambones!'})
        .pause({length: 1.0})
        .hangup()
        .send();
    } catch (err) {
      session.locals.logger.info({err}, `Error to responding to incoming call: ${session.call_sid}`);
      session.close();
    }

    // after 5 seconds remove ourselves from totally the media path
    setTimeout(noMedia.bind(this, session), 10000);

    // after 10 restore full media
    setTimeout(partialMedia.bind(this, session), 20000);

    // after 15 seconds go to partial media
    setTimeout(fullMedia.bind(this, session), 30000);

  });
};

const noMedia = (session) => {
  session.logger.info('change to no-media');
  session.injectCommand('media:path', 'no-media');
};

const partialMedia = (session) => {
  session.logger.info('change to partial-media');
  session.injectCommand('media:path', 'partial-media');
};

const fullMedia = (session) => {
  session.logger.info('change to full-media');
  session.injectCommand('media:path', 'full-media');
};

const onClose = (session, code, reason) => {
  const {logger} = session.locals;
  logger.info({session, code, reason}, `session ${session.call_sid} closed`);
};

const onError = (session, err) => {
  const {logger} = session.locals;
  logger.info({err}, `session ${session.call_sid} received error`);
};

module.exports = service;
