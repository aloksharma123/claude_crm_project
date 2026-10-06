const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();
router.use(requireAuth);
router.get("/", async (req,res)=>{
  const r=await pool.query("SELECT a.*,c.first_name,c.last_name,d.title AS deal_title FROM activities a LEFT JOIN contacts c ON c.id=a.contact_id LEFT JOIN deals d ON d.id=a.deal_id WHERE a.organization_id=$1 ORDER BY a.completed ASC,a.due_at ASC NULLS LAST,a.created_at DESC",[req.user.organizationId]);
  res.json(r.rows);
});
router.post("/",async(req,res)=>{
  const {contactId,dealId,type,body,dueAt}=req.body;
  if(!body)return res.status(400).json({error:"Activity description is required"});
  if(type&&!["note","call","email","task"].includes(type))return res.status(400).json({error:"Invalid activity type"});
  const r=await pool.query("INSERT INTO activities (organization_id,contact_id,deal_id,user_id,type,body,due_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",[req.user.organizationId,contactId||null,dealId||null,req.user.id,type||"note",body,dueAt||null]);
  res.status(201).json(r.rows[0]);
});
router.put("/:id/complete",async(req,res)=>{
  const r=await pool.query("UPDATE activities SET completed=true WHERE id=$1 AND organization_id=$2 RETURNING *",[req.params.id,req.user.organizationId]);
  if(!r.rows[0])return res.status(404).json({error:"Activity not found"}); res.json(r.rows[0]);
});
router.delete("/:id",async(req,res)=>{await pool.query("DELETE FROM activities WHERE id=$1 AND organization_id=$2",[req.params.id,req.user.organizationId]);res.status(204).end();});
module.exports=router;