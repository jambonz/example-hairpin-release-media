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
          timeLimit: 10,
          exitMediaPath: true,
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
  });
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