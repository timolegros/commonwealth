'use strict';

module.exports = {
  up: (queryInterface, DataTypes) => {
    return queryInterface.addColumn(
      'ChainEntities',
      'title',
      {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    );
  },

  down: (queryInterface, DataTypes) => {
    return queryInterface.removeColumn(
      'ChainEntities',
      'title',
      {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    );
  }
};
