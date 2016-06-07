import loadCommand from '../util/loadCommand'
import errorReporter from '../util/errorReporter'
import graphQLFetcher from '../util/graphQLFetcher'
import getServiceBaseURL, {GAME} from '../util/getServiceBaseURL'
import wrapInvokerWithArgvParser from '../util/wrapInvokerWithArgvParser'

export const {parse, usage, commandDescriptor} = loadCommand('cycle')

function invokeUpdateCycleStateAPI(state, lgJWT) {
  const mutation = {
    query: 'mutation($state: String!) { updateCycleState(state: $state) { id } }',
    variables: {state},
  }
  return graphQLFetcher(lgJWT, getServiceBaseURL(GAME))(mutation)
    .then(data => data.launchCycle)
}

function handleUpdateCycleStateCommand(state, statusMsg, notify, options) {
  const {
    lgJWT,
    lgUser,
    formatMessage,
    formatError
  } = options
  try {
    if (!lgJWT || !lgUser || lgUser.roles.indexOf('moderator') < 0) {
      throw new Error('You are not a moderator.')
    }
    notify(formatMessage(statusMsg))
    return invokeUpdateCycleStateAPI(state, lgJWT)
      .catch(error => {
        errorReporter.captureException(error)
        notify(formatError(`API invocation failed: ${error.message || error}`))
      })
  } catch (errorMessage) {
    notify(formatError(errorMessage.message))
  }
}

export const invoke = wrapInvokerWithArgvParser(parse, usage, (args, notify, options) => {
  const {
    formatUsage,
  } = options
  if (args._.length === 1) {
    const subcommandFuncs = {
      launch: () => handleUpdateCycleStateCommand('PRACTICE', '🚀  Initiating Launch... stand by.', notify, options),
      retro: () => handleUpdateCycleStateCommand('RETROSPECTIVE', '🤔  Initiating Retrospective... stand by.', notify, options),
    }
    return subcommandFuncs[args._[0]]()
  }

  notify(formatUsage(usage()))
})
