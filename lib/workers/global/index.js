const is = require('@sindresorhus/is');
const { initLogger } = require('../../logger');
const configParser = require('../../config');
const repositoryWorker = require('../repository');

module.exports = {
  start,
  getRepositoryConfig,
};

async function start() {
  initLogger();
  try {
    const config = await configParser.parseConfigs(process.env, process.argv);
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_ENDPOINT;
    delete process.env.GITHUB_COM_TOKEN;
    delete process.env.GITLAB_TOKEN;
    delete process.env.GITLAB_ENDPOINT;
    delete process.env.VSTS_TOKEN;
    delete process.env.VSTS_ENDPOINT;
    if (config.repositories.length === 0) {
      logger.warn(
        'No repositories found - did you want to run with flag --autodiscover?'
      );
    }
    // istanbul ignore if
    if (
      config.platform === 'github' &&
      config.endpoint &&
      !config.customPrFooter
    ) {
      config.prFooter =
        'This PR generated by Renovate Bot. Check out [Renovate Pro](https://renovatebot.com/pro) for real-time webhook handling and more.';
    }
    // Move global variables that we need to use later
    const importGlobals = ['exposeEnv', 'prBanner', 'prFooter'];
    config.global = {};
    importGlobals.forEach(key => {
      config.global[key] = config[key];
      delete config[key];
    });
    // Iterate through repositories sequentially
    for (const repository of config.repositories) {
      const repoConfig = getRepositoryConfig(config, repository);
      await repositoryWorker.renovateRepository(repoConfig);
    }
    logger.setMeta({});
    logger.info('Renovate finished');
  } catch (err) {
    logger.fatal(`Renovate fatal error: ${err.message}`);
    logger.error(err);
  }
}

function getRepositoryConfig(globalConfig, repository) {
  const repoConfig = configParser.mergeChildConfig(
    globalConfig,
    is.string(repository) ? { repository } : repository
  );
  repoConfig.isGitHub = repoConfig.platform === 'github';
  repoConfig.isGitLab = repoConfig.platform === 'gitlab';
  repoConfig.isVsts = repoConfig.platform === 'vsts';
  return configParser.filterConfig(repoConfig, 'repository');
}