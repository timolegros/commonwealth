'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.createTable('BucketCache', {
      name: { type: Sequelize.STRING, primaryKey: true },
      path: { type: Sequelize.STRING, allowNull: false }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.dropTable('BucketCache');
  }
};
