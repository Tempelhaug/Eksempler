/*
    Requirements in order to work:
        - a gameobject that serves as the emitter that serves as the parent of the BeamParticles spawned in.
        - _emitter variable needs to be set in inspector.
*/

namespace Lucidum.Pareidolia.GameScripts.Gameplay.Beam
{
    using System.Linq;
    using Actors.Player;
    using InControl;
    using Lucidum.Pareidolia.GameScripts.Actors;
    using Lucidum.Pareidolia.GameScripts.Actors.Events;
    using Lucidum.Pareidolia.GenericScripts.Effects;
    using UnityEngine;
    using Actors.Minions;
    using Lucidum.Pareidolia.GenericScripts;
    using Lucidum.Pareidolia.GenericScripts.Events;
    using Lucidum.Pareidolia.GameScripts.Gameplay.Input.InputEvents;

    public class BeamEmitter : MonoBehaviour
    {
        [SerializeField]
        [Range(10, 100)]
        private int density = 60;

        [SerializeField]
        public int speed = 20;

        [SerializeField]
        [Range(0, 1)]
        private float spread = 0.5f;

        [SerializeField]
        public float finishRange = 0.6f;

        [SerializeField]
        private GameObject emitter;

        [SerializeField]
        [Range(10.0f, 30.0f)]
        private float channelRange = 15f;

        [SerializeField]
        [Range(10.0f, 60.0f)]
        private float beamAngle = 30f;
        public float BeamAngle
        {
            get {
                return this.beamAngle;
            }

            set {
                if (value < 10.0f)
                {
                    this.beamAngle = 10.0f;
                } else if (value > 60.0f)
                {
                    this.beamAngle = 60.0f;
                } else
                {
                    this.beamAngle = value;
                }
            }
        }

        // public int _particlesAlive;

        // Heights used to check if we can hit minions (minions have different heights)
        private float vec1Height = 0.0f;
        private float vec2Height = 0.25f;
        private float vec3Height = 0.75f;
        private float vec4Height = 1.25f;
        private float vec5Height = 1.75f;
        private int mask;

        private InputDevice controller;

        private bool renderDebugLine;

        [Header("Drain Energy Prefabs")]
        public GameObject drainLinePrefab;

        [Header("Give Energy Prefabs")]
        public GameObject giveLinePrefab;

        [Header("Aim Prefabs")]
        public GameObject giveLineRendererPrefab;
        // public GameObject giveStartPrefab;
        public GameObject giveEndPrefab;

        [Header("Adjustable Variables")]
        public float beamEndOffset = 0.3f;       // How far from the raycast hit point the end effect is positioned
        public float textureScrollSpeed = 8f;  // How fast the texture scrolls along the beam
        public float textureLengthScale = 3;   // Length of the beam texture

        private Vector3 beamOffset = new Vector3(0.0f, 0.75f, 0.0f);
        private Vector3 beamEndCircleOffset = new Vector3(0.25f, 0f, 0f);
        private KeyCode drainEnergyKey = KeyCode.E;
        private KeyCode giveEnergyKey = KeyCode.Q;
        private Transform currentTarget = null;
        private float totalTimeChanneled = 0.0f;
        private float channelTimeRequired;
        // private GameObject _beamStart;
        private GameObject beamEnd;
        private GameObject beam;
        private LineRenderer line;

        private Blink blink;
        private Blink Blink
        {
            get
            {
                if (this.blink == null)
                {
                    this.blink = this.GetComponent<Blink>();
                }
                return this.blink;
            }
        }

        private EnergyEmitter particleEmitter;
        private EnergyEmitter ParticleEmitter
        {
            get
            {
                if (this.particleEmitter == null)
                {
                    this.particleEmitter = this.gameObject.AddComponent<EnergyEmitter>();
                    this.particleEmitter.SetupVariables(this.density, this.speed, this.spread, this.finishRange, this.emitter);
                }
                return this.particleEmitter;
            }
        }

        private GameObject beamStartPosition;
        private GameObject BeamStartPosition
        {
            get
            {
                if (this.beamStartPosition == null)
                {
                    this.beamStartPosition = Misc.FindObject(GameObject.Find("Player"), "BeamStartPosition");
                }
                return this.beamStartPosition;
            }
        }

        private Actor casterActor;
        private Actor CasterActor
        {
            get
            {
                if (this.casterActor == null)
                {
                    this.casterActor = this.gameObject.GetComponent<Actor>();
                }
                return this.casterActor;
            }
        }

        private float lowestLimbCost;
        private float defaultLowestLimbCost = 15f;

        private GameObject energyLine;
        private float defaultEffectSize = 8.0f;
        private float effectScale = 0.8f;

        // Use this for initialization
        void Start()
        {
            this.mask = 1 << LayerMask.NameToLayer("ChannelMask");

            if (this.CasterActor == null)
            {
                throw new MissingComponentException("Missing actor");
            }

            if (this.BeamStartPosition == null)
            {
                throw new MissingReferenceException("Missing beam start position");
            }

            if (this.ParticleEmitter == null)
            {
                throw new MissingReferenceException("Missing energy emitter");
            }

            if (this.Blink == null)
            {
                throw new MissingComponentException("Missing blink");
            }

            this.controller = InputManager.ActiveDevice;
            this.channelTimeRequired = RemoteSettings.GetFloat("ChannelTimePerEnergy", 0.1f);

            float[] limbCosts = { RemoteSettings.GetFloat("ArmsLevel1Cost", this.defaultLowestLimbCost), RemoteSettings.GetFloat("BrainLevel1Cost", this.defaultLowestLimbCost), RemoteSettings.GetFloat("EyesLevel1Cost", this.defaultLowestLimbCost), RemoteSettings.GetFloat("FeetLevel1Cost", this.defaultLowestLimbCost) };
            this.lowestLimbCost = limbCosts.Min();
        }

        // Update is called once per frame
        void Update()
        {
            this.controller = InputManager.ActiveDevice;
            if (Input.GetKey(KeyCode.L))
            {
                this.renderDebugLine = !this.renderDebugLine;
            }

            if (this.Blink.beamInactive)
            {
                this.DeactivateBeam();
                return;
            }

            Abilities abilities = this.gameObject.GetComponent<Abilities>();
            if (abilities && abilities.HasUnlockedAbility(typeof(BeamEmitter), 0))
            {
                if (this.controller.Name.Equals("Keyboard/Mouse"))
                {
                    if (this.controller.RightTrigger != 0)
                    {
                        this.ChannelSpell(this.transform);
                    } 
                    // else if (this.controller.LeftTrigger != 0)
                    // {
                    //     this.ChannelSpell(this.transform);
                    // }
                    else
                    {
                        this.DeactivateBeam();
                    }
                } else if (this.controller.RightStickX != 0f || this.controller.RightStickY != 0)
                {
                    this.ChannelSpell(this.transform);
                } else
                {
                    this.DeactivateBeam();
                }

                if (this.controller.RightTrigger > 0f && abilities.HasUnlockedAnyLimb())
                {
                    if (this.energyLine == null)
                    {
                        GiveEnergy(this.lowestLimbCost);
                    }
                }
                // else if (this.controller.LeftTrigger > 0f)
                // {
                //     if (this.energyLine == null)
                //     {
                //         DrainEnergy(this.lowestLimbCost);
                //     }

                // }
            }
        }

        /// <summary>
        /// Activates the visual beam elements. Elements' position are updated accordingly in ChannelSpell
        /// </summary>
        /// <param name="start"></param>
        /// <param name="stop"></param>
        private void EnableBeam()
        {
            if (this.beamEnd == null)
            {
                // _beamStart = Instantiate(_giveStartPrefab, Vector3.zero, Quaternion.identity) as GameObject;
                this.beamEnd = Instantiate(this.giveEndPrefab, Vector3.zero, Quaternion.identity) as GameObject;
                this.beam = Instantiate(this.giveLineRendererPrefab, Vector3.zero, Quaternion.identity) as GameObject;
                this.beamEnd.transform.parent = this.beam.transform;
                this.line = this.beam.GetComponent<LineRenderer>();
                AkSoundEngine.PostEvent("PlayerBeamActiveEvent", gameObject);
            }
        }

        private void ChannelSpell(Transform caster)
        {
            this.EnableBeam();
            this.line.positionCount = 2;

            Vector3 start = this.BeamStartPosition.transform.position;
            this.line.SetPosition(0, start);

            Vector3 casterPos1 = caster.position + new Vector3(0, this.vec1Height, 0);
            Vector3 casterPos2 = caster.position + new Vector3(0, this.vec2Height, 0);
            Vector3 casterPos3 = caster.position + new Vector3(0, this.vec3Height, 0);
            Vector3 casterPos4 = caster.position + new Vector3(0, this.vec4Height, 0);
            Vector3 casterPos5 = caster.position + new Vector3(0, this.vec5Height, 0);

            RaycastHit hit;
            Debug.DrawRay(caster.position, caster.forward, Color.cyan);
            if (this.currentTarget != null)
            {

                if (this.beamEnd.activeSelf)
                {
                    this.beamEnd.SetActive(false);
                }

                if (Physics.Raycast(casterPos1, caster.forward, out hit, this.channelRange, this.mask) || Physics.Raycast(casterPos2, caster.forward, out hit, this.channelRange, this.mask) || Physics.Raycast(casterPos3, caster.forward, out hit, this.channelRange, this.mask) || Physics.Raycast(casterPos4, caster.forward, out hit, this.channelRange, this.mask) || Physics.Raycast(casterPos5, caster.forward, out hit, this.channelRange, this.mask))
                {
                    Vector3 end = new Vector3(hit.point.x, start.y, hit.point.z) - (this.transform.forward.normalized * this.beamEndOffset);

                    if (this.currentTarget.transform.IsChildOf(hit.transform))
                    {
                        this.line.SetPosition(1, end);

                        float distance = Vector3.Distance(start, end);
                        this.line.sharedMaterial.mainTextureScale = new Vector2(distance / this.textureLengthScale, 1);
                        this.line.sharedMaterial.mainTextureOffset = new Vector2(Time.deltaTime * this.textureScrollSpeed, 0);
                        // Debug.Log("Is child of: " + hit.transform.name);
                    } else
                    {
                        // Debug.Log("Not child of: " + hit.transform.name);
                        ActiveOutline outline = this.currentTarget.gameObject.GetComponent<ActiveOutline>();
                        if (outline != null)
                        {
                            Destroy(outline);
                        }

                        this.currentTarget = null;
                    }
                } else
                {
                    // Debug.Log("Raycast didn't hit.");
                    ActiveOutline outline = this.currentTarget.gameObject.GetComponent<ActiveOutline>();
                    if (outline != null)
                    {
                        Destroy(outline);
                    }

                    this.currentTarget = null;
                }
            } else
            {
                Vector3 end = start + (this.transform.forward * (this.channelRange - Vector3.Distance(start, this.transform.position)));
                if (!this.beamEnd.activeSelf)
                {
                    this.beamEnd.SetActive(true);
                }

                Vector3 beamCirclePos = end + ((this.line.GetPosition(1) - this.line.GetPosition(0)) * this.beamEndOffset);
                this.beamEnd.transform.position = beamCirclePos;
                this.line.SetPosition(1, end);

                this.beamEnd.transform.LookAt(this.BeamStartPosition.transform.position);

                float distance = Vector3.Distance(start, end);
                this.line.sharedMaterial.mainTextureScale = new Vector2(distance / this.textureLengthScale, 1);
                this.line.sharedMaterial.mainTextureOffset = new Vector2(Time.deltaTime * this.textureScrollSpeed, 0);

                if (Physics.Raycast(casterPos1, caster.forward, out hit, this.channelRange, this.mask) || Physics.Raycast(casterPos2, caster.forward, out hit, this.channelRange, this.mask) || Physics.Raycast(casterPos3, caster.forward, out hit, this.channelRange, this.mask) || Physics.Raycast(casterPos4, caster.forward, out hit, this.channelRange, this.mask) || Physics.Raycast(casterPos5, caster.forward, out hit, this.channelRange, this.mask))
                {
                    this.currentTarget = hit.transform;
                    if (this.currentTarget.GetComponent<ActiveOutline>() == null)
                    {
                        this.currentTarget.gameObject.AddComponent<ActiveOutline>();
                        Abilities abilities = this.gameObject.GetComponent<Abilities>();
                        if (!abilities.HasUnlockedAnyLimb())
                        {
                            if (this.energyLine == null)
                            {
                                AkSoundEngine.PostEvent("PlayerGiveEnergyNoAbilityEvent", gameObject);
                                EventHandler.Instance.Raise(new NoAbilitiesEvent()
                                {

                                });
                            }
                        }
                    }
                }

            }
        }

        // private void DrainEnergy(float energy)
        // {
        //     if (this.currentTarget == null)
        //     {
        //         return;
        //     }

        //     Actor targetMinion = this.currentTarget.GetComponentInParent<Actor>();
        //     if (targetMinion == null)
        //     {
        //         return;
        //     }

        //     if (targetMinion.Energy.CurrentVal >= energy && targetMinion.Energy.CurrentVal >= targetMinion.UsedEnergy.CurrentVal)
        //     {
        //         if (this.energyLine == null && this.drainLinePrefab != null)
        //         {
        //             this.energyLine = Instantiate(this.drainLinePrefab, Vector3.zero, Quaternion.identity) as GameObject;
        //             this.energyLine.transform.position = this.BeamStartPosition.transform.position;
        //             this.energyLine.transform.rotation = Quaternion.LookRotation(this.line.GetPosition(1) - this.line.GetPosition(0));
        //             float distance = Vector3.Distance(this.transform.position, this.currentTarget.position);
        //             this.energyLine.transform.localScale = Vector3.one * (distance / this.defaultEffectSize) * effectScale;
        //             Destroy(this.energyLine, 1.0f);
        //         }

        //         GenericScripts.Events.EventHandler.Instance.Raise(new UpdateStats()
        //         {
        //             Actor = this.CasterActor,
        //             Energy = new GenericScripts.Data.Stat()
        //             {
        //                 MaxVal = this.CasterActor.Energy.MaxVal,
        //                 CurrentVal = this.CasterActor.Energy.CurrentVal + energy
        //             }
        //         });

        //         GenericScripts.Events.EventHandler.Instance.Raise(new UpdateStats()
        //         {
        //             Actor = targetMinion,
        //             Energy = new GenericScripts.Data.Stat()
        //             {
        //                 MaxVal = targetMinion.Energy.MaxVal,
        //                 CurrentVal = targetMinion.Energy.CurrentVal - energy
        //             }
        //         });

        //         EnergyEmitter targetEmitter = targetMinion.GetComponent<EnergyEmitter>();
        //         MinionEnergyReturn targetTransfer = targetMinion.GetComponent<MinionEnergyReturn>();
        //         if (targetEmitter != null)
        //         {
        //             Destroy(targetEmitter);
        //         }

        //         if (targetTransfer != null)
        //         {
        //             Destroy(targetTransfer);
        //         }

        //         if (/*targetMinion.Energy.CurrentVal - targetMinion.UsedEnergy.CurrentVal <= 0 && */!targetMinion.Controlled)
        //         {
        //             GenericScripts.Events.EventHandler.Instance.Raise(new MinionDowngradeEvent()
        //             {
        //                 Minion = targetMinion
        //             });
        //             GenericScripts.Events.EventHandler.Instance.Raise(new CurrentMinionChangedEvent()
        //             {
        //                 minion = targetMinion
        //             }); 
        //         }
        //     }

        // }

        private void GiveEnergy(float energy)
        {
            if (this.currentTarget == null)
            {
                return;
            }

            Minion targetMinion = this.currentTarget.GetComponentInParent<Minion>();
            if (targetMinion == null)
            {
                return;
            }

            if (this.CasterActor.Energy.CurrentVal < energy/* ||
                targetMinion.Energy.CurrentVal + energy > targetMinion.Energy.MaxVal ||
                targetMinion.Energy.CurrentVal >= targetMinion.UsedEnergy.CurrentVal + this.lowestLimbCost*/)
            {
                return;
            }

            if (this.energyLine == null && this.giveLinePrefab != null)
            {
                this.energyLine = Instantiate(this.giveLinePrefab, Vector3.zero, Quaternion.identity) as GameObject;
                this.energyLine.transform.position = this.BeamStartPosition.transform.position;
                this.energyLine.transform.rotation = Quaternion.LookRotation(this.line.GetPosition(1) - this.line.GetPosition(0));
                float distance = Vector3.Distance(this.transform.position, this.currentTarget.position);
                this.energyLine.transform.localScale = Vector3.one * (distance / this.defaultEffectSize) * effectScale;
                Destroy(this.energyLine, 1.0f);
            }

            // GenericScripts.Events.EventHandler.Instance.Raise(new UpdateStats()
            // {
            //     Actor = this.CasterActor,
            //     Energy = new GenericScripts.Data.Stat()
            //     {
            //         MaxVal = this.CasterActor.Energy.MaxVal,
            //         CurrentVal = this.CasterActor.Energy.CurrentVal - energy
            //     }
            // });

            // GenericScripts.Events.EventHandler.Instance.Raise(new UpdateStats()
            // {
            //     Actor = targetMinion,
            //     Energy = new GenericScripts.Data.Stat()
            //     {
            //         MaxVal = targetMinion.Energy.MaxVal,
            //         CurrentVal = targetMinion.Energy.CurrentVal + energy
            //     }
            // });

            // GenericScripts.Events.EventHandler.Instance.Raise(new EnergyGainEvent()
            // {
            //     Actor = targetMinion,
            //     Initiator = this.CasterActor
            // });

            if (targetMinion.GetComponent<EnergyEmitter>() == null)
            {
                EnergyEmitter e = targetMinion.gameObject.AddComponent<EnergyEmitter>();
                e.SetupVariables(this.density, this.speed * 2, this.spread, this.finishRange, this.emitter);
            }

            // if (targetMinion.GetComponent<MinionEnergyReturn>() == null)
            // {
            //     targetMinion.gameObject.AddComponent<MinionEnergyReturn>();
            // }

            // if (targetMinion.Energy.CurrentVal - targetMinion.UsedEnergy.CurrentVal >= this.lowestLimbCost)
            // {
                GenericScripts.Events.EventHandler.Instance.Raise(new MinionUpgradeEvent()
                {
                    Minion = targetMinion
                });
                GenericScripts.Events.EventHandler.Instance.Raise(new CurrentMinionChangedEvent()
                {
                    minion = targetMinion,
                    currentMinionID = -1
                });
            // }

        }

        private void DeactivateBeam()
        {
            if (this.beamEnd != null)
            {
                if (this.currentTarget != null)
                {
                    ActiveOutline outline = this.currentTarget.gameObject.GetComponent<ActiveOutline>();
                    if (outline != null)
                    {
                        Destroy(outline);
                    }
                    
                    this.currentTarget = null;
                }
                AkSoundEngine.PostEvent("PlayerBeamInActiveEvent", gameObject);
                Destroy(this.beamEnd);
                Destroy(this.beam);
            }
        }

    }

}
