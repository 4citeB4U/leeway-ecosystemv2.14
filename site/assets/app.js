/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.INDUSTRUES.PUBLIC.CONTACT
TAG: LEEWAY.INDUSTRUES.NONCAPTURING_CONTACT.V1
5WH:
WHAT = Prepare visitor's voluntary email request instead of fabricating Agent Lee registration.
WHY = A claimed mailing-list conversion without a persisted consent record would violate the brand's truth-first standard.
WHO = LeeWay IndusTrues public website visitors.
WHERE = site/assets/app.js
WHEN = 2026-10-28
HOW = Input and consent validation, URI-encoded mailto to the owner's selected business inbox, with honest completion message.
AUTHORITY: No mailing-list database, password enrollment, email send, or production admission.
LICENSE: Original web code reserved for LeeWay creator.
*/
(() => {
 'use strict';
 const year = document.getElementById('year');
 if(year) year.textContent = String(new Date().getFullYear());
 const form=document.getElementById('interest-form');
 const status=document.getElementById('status');
 if(!form||!status) return;
 const topics=Object.freeze({
  agent:'Agent Lee early access',updates:'LeeWay IndusTrues updates',
  both:'Agent Lee early access and product updates',partner:'Product or partnership inquiry'
 });
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const name=document.getElementById('name');
  const email=document.getElementById('email');
  const interest=document.getElementById('interest');
  const consent=document.getElementById('consent');
  if(!name||!email||!interest||!consent) return;
  const value=email.value.trim(), nameValue=name.value.trim(), topic=topics[interest.value];
  if(!email.validity.valid||!value||!consent.checked||!topic||nameValue.length>100){
   status.textContent='Please enter a valid email, select an interest, and check the consent box.';
   if(!email.validity.valid||!value) email.focus();else consent.focus();
   return;
  }
  const subject='LeeWay IndusTrues — '+topic;
  const body=['Hello LeeWay IndusTrues,','',
   'I would like information about: '+topic+'.',
   'My email is: '+value,
   nameValue?'My name is: '+nameValue:'',
   '','Please share the available next steps.',
   'I understand this is an email inquiry, not an automatic registration or mailing-list subscription.'];
  const mail='mailto:leonard.lee@leewayindustrues.com?subject='+
    encodeURIComponent(subject)+'&body='+encodeURIComponent(body.filter(Boolean).join('\n'));
  status.textContent='Your email application should open. You must send the message there to complete this request. No signup has been saved here.';
  window.location.href=mail;
 });
})();
