import loadCommand from '../util/loadCommand'
import errorReporter from '../util/errorReporter'
import graphQLFetcher from '../util/graphQLFetcher'
import getServiceBaseURL, {GAME} from '../util/getServiceBaseURL'
import composeInvoke from '../util/composeInvoke'
import {userIsModerator} from '../util/userValidation'

export const {parse, usage, commandDescriptor} = loadCommand('cycle')

function invokeUpdateCycleStateAPI(state, lgJWT) {
  const mutation = {
    query: 'mutation($state: String!) { updateCycleState(state: $state) { id } }',
    variables: {state},
  }
  return graphQLFetcher(lgJWT, getServiceBaseURL(GAME))(mutation)
    .then(data => data.updateCycleState)
}

function invokeCreateCycleAPI(lgJWT, projectDefaultExpectedHours) {
  const mutation = {
    query: 'mutation($projectDefaultExpectedHours: Int) { createCycle(projectDefaultExpectedHours: $projectDefaultExpectedHours) { id cycleNumber projectDefaultExpectedHours } }',
    variables: {projectDefaultExpectedHours},
  }
  return graphQLFetcher(lgJWT, getServiceBaseURL(GAME))(mutation)
    .then(data => data.createCycle)
}

function handleCycleInitCommand(args, notify, options) {
  const {
    lgJWT,
    lgUser,
    formatMessage,
    formatError
  } = options
  if (!lgJWT || !userIsModerator(lgUser)) {
    return Promise.reject('You are not a moderator.')
  }

  const hoursInfo = args.hours ? `with ${args.hours} expected hours per project ` : ''

  return invokeCreateCycleAPI(lgJWT, args.hours)
    .then(cycle => notify(formatMessage(`Cycle #${cycle.cycleNumber} Initializing ${hoursInfo}... stand by.`)))
    .catch(err => {
      errorReporter.captureException(err)
      notify(formatError(err.message || err))
    })
}

function handleUpdateCycleStateCommand(state, statusMsg, notify, options) {
  const {
    lgJWT,
    lgUser,
    formatMessage,
    formatError
  } = options
  if (!lgJWT || !userIsModerator(lgUser)) {
    return Promise.reject('You are not a moderator.')
  }
  notify(formatMessage(statusMsg))
  return invokeUpdateCycleStateAPI(state, lgJWT)
    .catch(err => {
      errorReporter.captureException(err)
      notify(formatError(err.message || err))
    })
}

export const invoke = composeInvoke(parse, usage, (args, notify, options) => {
  if (args._.length >= 1) {
    const subcommandFuncs = {
      init: () => handleCycleInitCommand(args.$.init, notify, options),
      launch: () => handleUpdateCycleStateCommand('PRACTICE', '🚀  Initiating Launch... stand by.', notify, options),
      reflect: () => handleUpdateCycleStateCommand('REFLECTION', '🤔  Initiating Reflection... stand by.', notify, options),
    }
    return subcommandFuncs[args._[0]]()
  }

  return Promise.reject('Invalid arguments. Try --help for usage.')
})
