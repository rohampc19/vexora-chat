import * as s from '../services/monetization.service.js';
export const catalog=async(_req,res)=>res.json(await s.catalog());
export const state=async(req,res)=>res.json(await s.state(req.user.sub));
export const buyPremium=async(req,res)=>res.status(201).json(await s.buyPremium(req.user.sub,req.body.planId));
export const buyCoins=async(req,res)=>res.status(201).json(await s.buyCoins(req.user.sub,req.body.packageId));
export const completeMock=async(req,res)=>res.json(await s.completeMock(req.user.sub,req.params.paymentId));
export const buyItem=async(req,res)=>res.status(201).json(await s.buyItem(req.user.sub,req.params.id));
export const customize=async(req,res)=>res.json(await s.customize(req.user.sub,req.body));
export const transactions=async(req,res)=>res.json({transactions:await s.transactions(req.user.sub)});
