import { Request, Response, NextFunction } from 'express';
import { factory, formatFilename } from '../../shared/logging';
import { DB } from '../database';
import fetch from 'node-fetch';
import { Buckets, PrivateKey } from '@textile/hub';

const log = factory.getLogger(formatFilename(__filename));

export const Errors = {
  NeedAddress: 'Must provide address',
  NeedChain: 'Must provide chain',
  InvalidChain: 'Invalid chain',
};

const createAddress = async (models: DB, req: Request, res: Response, next: NextFunction) => {
  // start the process of creating a new address. this may be called
  // when logged in to link a new address for an existing user, or
  // when logged out to create a new user by showing proof of an address.
  if (!req.body.address) {
    return next(new Error(Errors.NeedAddress));
  }
  if (!req.body.chain) {
    return next(new Error(Errors.NeedChain));
  }

  const chain = await models.Chain.findOne({
    where: { id: req.body.chain }
  });

  if (!chain) {
    return next(new Error(Errors.InvalidChain));
  }

  const existingAddress = await models.Address.scope('withPrivateData').findOne({
    where: { chain: req.body.chain, address: req.body.address }
  });

  if (existingAddress) {
    // address already exists on another user, only take ownership if
    // unverified and expired
    const expiration = existingAddress.verification_token_expires;
    const isExpired = expiration && +expiration <= +(new Date());
    const isDisowned = existingAddress.user_id == null;
    const isCurrUser = req.user && (existingAddress.user_id === req.user.id);
    // if owned by someone else, generate a token but don't replace user until verification
    // if you own it, or if it's unverified, associate with address immediately
    const updatedId = (req.user && ((!existingAddress.verified && isExpired) || isDisowned || isCurrUser))
      ? req.user.id : null;
    const updatedObj = await models.Address.updateWithToken(existingAddress, updatedId, req.body.keytype);

    //TODO: add identityCache to database.ts

    // TODO: address changed user so update ipfs
    if (existingAddress.id != updatedId) {}

    // even if this is the existing address, there is a case to login to community through this address's chain
    // if req.body.community is valid, then we should create a role between this community vs address
    if (req.body.community) {
      const role = await models.Role.findOne({
        where: { address_id: updatedObj.id, offchain_community_id: req.body.community }
      });
      if (!role) {
        await models.Role.create({
          address_id: updatedObj.id,
          offchain_community_id: req.body.community,
          permission: 'member',
        });
      }
    }
    // TODO: deal with this case
    return res.json({ status: 'Success', result: updatedObj.toJSON() });
  } else {
    // address doesn't exist, add it to the database
    try {
      const newObj = await models.Address.createWithToken(
        req.user ? req.user.id : null,
        req.body.chain,
        req.body.address,
        req.body.keytype
      );

      // if req.user.id is undefined, the address is being used to create a new user,
      // and we should automatically give it a Role in its native chain (or community)
      if (!req.user) {
        await models.Role.create(req.body.community ? {
          address_id: newObj.id,
          offchain_community_id: req.body.community,
          permission: 'member',
        } : {
          address_id: newObj.id,
          chain_id: req.body.chain,
          permission: 'member',
        });

        let ipfsContent = {
          addresses: {
            [req.body.chain]: [req.body.address]
          },
          twitterHandle: '',
          roles: {
            [req.body.community ? req.body.community : req.body.chain]: 'member'
          }
        }

        if (req.body.community) ipfsContent['communities'] = [req.body.community];
        else ipfsContent['communities'] = [];

        const jsonData = JSON.stringify(ipfsContent);

        // create a new user file in ipfs
        const temp = await bucketClient.pushPath(
          bucketKeys.Users, `${newObj.id}.json`,
          Buffer.from(jsonData)
        );
        // const temp = await bucketClient.pushPath('bafzbeiamkfqyemughngc3z2grv7hykllastjzswpgimjzyrbtbyoinpgpe', 'test9.json', Buffer.from(JSON.stringify({"id": "fat L"})))
        console.log("temp:", temp)

        return res.json({ status: 'Success', result: newObj.toJSON() });
      }

      let result, content;
      try {
        result = await fetch(`https://ipfs.io/ipns/${bucketKeys.Users}/${req.user.id}.json`)
      } catch (error) {
        // if the user file doesn't exist create it and populate it with data
        if (error.message.includes('no link named')) {
          // query DB to get current start with user_id
          const userAddresses = await models.Address.findAll({
            where: {
              'user_id': req.user.id
            }
          })

          // get all of a users roles
          const userRoles = await models.Role.findAll({
            where: {
              'address_id': userAddresses.map(o => o.id)
            }
          })

          const addresses = {};
          userAddresses.forEach((o) => {
            if (addresses[o.chain]) {
              addresses[o.chain].push(o.address)
            } else {
              addresses[o.chain] = [o.address]
            }
          })

          const roles = {};
          userRoles.forEach((role) => {
            // TODO
          })

          content = {
            addresses,
            twitterHandle: '', // TODO: get this from DB
            roles: {
              [req.body.community ? req.body.community : req.body.chain]: 'member'
            }
          }
        } else {
          throw error
        }
      }

      // if the user file already exists just update the JSON blob it stores
      if (!content) {
        const ipfsUserData = await result.json();
        if (ipfsUserData.addresses[req.body.chain]) {
          ipfsUserData.addresses[req.body.chain].push(req.body.address)
        } else {
          ipfsUserData.addresses = {
            [req.body.chain]: [req.body.address]
          }
          if (!ipfsUserData.roles[req.body.community ? req.body.community : req.body.chain])
            ipfsUserData.roles[req.body.community ? req.body.community : req.body.chain] = 'member';
        }

        content = ipfsUserData
      }

      // push to bucket
      await bucketClient.pushPath(
        bucketKeys.Users, `${req.user.id}.json`,
        Buffer.from(JSON.stringify(content))
      );

      return res.json({ status: 'Success', result: newObj.toJSON() });
    } catch (e) {
      return next(e);
    }
  }
};

export default createAddress;
