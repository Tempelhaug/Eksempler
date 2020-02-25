// <copyright file="MinionHUD.cs" company="Studio Lucidum AS">
// Copyright (c) Studio Lucidum AS. All rights reserved.
// </copyright>

namespace Lucidum.Pareidolia.GameScripts.Actors.Minions
{
    using System;
    using System.Collections.Generic;
    using System.Threading.Tasks;
    using Gameplay.Input.InputEvents;
    using Gameplay.UI.HUD;
    using InControl;
    using Lucidum.Pareidolia.GameScripts.Actors.Events;
    using Lucidum.Pareidolia.GameScripts.Actors.Minions.Events;
    using Lucidum.Pareidolia.GameScripts.Actors.Minions.Limbs;
    using Lucidum.Pareidolia.GameScripts.Events.Actors.Minion;
    using Lucidum.Pareidolia.GameScripts.Input;
    using Lucidum.Pareidolia.GenericScripts.Debug;
    using Lucidum.Pareidolia.GenericScripts.Effects;
    using Player;
    using UnityEngine;

    [DisallowMultipleComponent]
    [RequireComponent(typeof(Animator))]
    public class MinionHUD : MonoBehaviour
    {

        public Dictionary<String, bool> MinionType = new Dictionary<string, bool>();

        private Animator animator;
        private Animator Animator
        {
            get
            {
                if (this.animator == null)
                {
                    this.animator = this.GetComponent<Animator>();
                }
                return this.animator;
            }
        }

        [SerializeField]
        private List<Minion> minions = new List<Minion>();

        private List<GameObject> minionIcons = new List<GameObject>();

        private GameObject player;
        private GameObject Player
        {
            get
            {
                if (this.player == null)
                {
                    this.player = GameObject.Find("Player");
                }
                return this.player;
            }
        }

        [SerializeField]
        private int maxMinions = 7;

        private int currentMinionIdx = 0;

        private bool isUpgradingLimb = false;
        private bool isDowngradingLimb = false;
        private bool firstMinion = true;
        private CurrentEntity _currentlyControlledEntity;

        private string logTag = "MinionHUD";

        private enum CurrentEntity
        {
            Player,
            Minion
        }
        private void OnEnable()
        {
            GenericScripts.Events.EventHandler.Instance.AddListener<LimbSelectedEvent>(this.OnLimbSelected);
            GenericScripts.Events.EventHandler.Instance.AddListener<ActionSelectedEvent>(this.OnActionSelected);
            GenericScripts.Events.EventHandler.Instance.AddListener<MinionChangedEvent>(this.OnMinionChanged);
            GenericScripts.Events.EventHandler.Instance.AddListener<ControlledEntityChangedEvent>(this.OnControlledEntityChanged);
            GenericScripts.Events.EventHandler.Instance.AddListener<MinionKilledEvent>(this.OnMinionKilled);
            GenericScripts.Events.EventHandler.Instance.AddListener<MinionDeactivatedEvent>(this.OnMinionDeactivated);
        }

        private void OnDisable()
        {
            GenericScripts.Events.EventHandler.Instance.RemoveListener<LimbSelectedEvent>(this.OnLimbSelected);
            GenericScripts.Events.EventHandler.Instance.RemoveListener<ActionSelectedEvent>(this.OnActionSelected);
            GenericScripts.Events.EventHandler.Instance.RemoveListener<MinionChangedEvent>(this.OnMinionChanged);
            GenericScripts.Events.EventHandler.Instance.RemoveListener<ControlledEntityChangedEvent>(this.OnControlledEntityChanged);
            GenericScripts.Events.EventHandler.Instance.RemoveListener<MinionKilledEvent>(this.OnMinionKilled);
            GenericScripts.Events.EventHandler.Instance.RemoveListener<MinionDeactivatedEvent>(this.OnMinionDeactivated);
        }

        private void Start()
        {
            MinionType.Add("Cactus", new bool());
            MinionType.Add("Tree", new bool());
            MinionType.Add("Rock", new bool());
            MinionType.Add("Trashcan", new bool());
            MinionType.Add("Outhouse", new bool());
            MinionType.Add("RedBarrel", new bool());
            MinionType.Add("Cauldron", new bool());

            if (this.Animator == null)
            {
                throw new MissingComponentException("Missing animator");
            }

            if (this.Player == null)
            {
                throw new MissingReferenceException("Missing player");
            }
        }

        private void Update()
        {
            InputDevice controller = InputManager.ActiveDevice;
            if (controller == null)
            {
                return;
            }

            if (this.currentMinionIdx >= 0 && this.currentMinionIdx < this.minions.Count && false)
            {
                Minion minion = this.minions[this.currentMinionIdx];
                if (minion != null && _currentlyControlledEntity != CurrentEntity.Minion)
                {
                    if (GameObject.Find("MinionHUD").GetComponentInChildren<ActionSelector>() == null &&
                        GameObject.Find("MinionHUD").GetComponentInChildren<LimbSelector>() == null)
                    {
                        if (controller.DPadDown.WasPressed && minion.GetComponent<Feet>() != null)
                        {
                            CloseSelectors();
                            this.EnableActionSelector(typeof(Feet));
                        }
                        else if (controller.DPadLeft.WasPressed && minion.GetComponent<Arms>() != null)
                        {
                            CloseSelectors();
                            this.EnableActionSelector(typeof(Arms));
                        }
                        else if (controller.DPadUp.WasPressed && minion.GetComponent<Brain>() != null)
                        {
                            CloseSelectors();
                            this.EnableActionSelector(typeof(Brain));
                        }
                        else if (controller.DPadRight.WasPressed && minion.GetComponent<Eyes>() != null)
                        {
                            CloseSelectors();
                            this.EnableActionSelector(typeof(Eyes));
                        }
                    }
                }
            }

            this.HandleMinionInactivity();
        }

        private void HandleMinionInactivity()
        {
            foreach (Minion minion in this.minions)
            {
                if (minion.IsDead || !minion.IsActive)
                {
                    continue;
                }
                Inactivity inactivity = minion.GetComponent<Inactivity>();
                if (inactivity == null)
                {
                    continue;
                }
                float distance = Vector3.Distance(
                    this.Player.transform.position,
                    minion.transform.position
                );
                int index = this.minions.IndexOf(minion);
                if (index < 0 || index >= this.minionIcons.Count)
                {
                    continue;
                }
                GameObject minionIcon = this.minionIcons[index];
                Animator animator = minionIcon.GetComponent<Animator>();
                if (distance > 0.8f * inactivity.Range)
                {
                    if (
                        animator.GetCurrentAnimatorStateInfo(0).normalizedTime > 1 &&
                        !animator.IsInTransition(0))
                    {
                        if (index == currentMinionIdx)
                        {
                            animator.Play("MiddleIconBlink");
                        }
                        else if (index == (currentMinionIdx - 1 + this.minionIcons.Count) % this.minionIcons.Count)
                        {
                            animator.Play("LeftIconBlink");
                        }
                        else if (index == (currentMinionIdx + 1) % this.minionIcons.Count)
                        {
                            animator.Play("RightIconBlink");
                        }
                    }
                }
                else
                {
                    AnimatorClipInfo[] info = animator.GetCurrentAnimatorClipInfo(0);
                    foreach (AnimatorClipInfo i in info)
                    {
                        switch (i.clip.name)
                        {
                            case "LeftIconBlink":
                                animator.Play("LeftIconIdle");
                                break;
                            case "MiddleIconBlink":
                                animator.Play("MiddleIconIdle");
                                break;
                            case "RightIconBlink":
                                animator.Play("RightIconIdle");
                                break;
                        }
                    }
                }
            }
        }

        private void OnControlledEntityChanged(ControlledEntityChangedEvent e)
        {
            if (e.controlledEntity.name.Equals("Player"))
            {
                _currentlyControlledEntity = CurrentEntity.Player;
            }
            else
            {
                _currentlyControlledEntity = CurrentEntity.Minion;
            }
        }

        private void EnableActionSelector(Type limb)
        {
            string prefab = "UI/MinionUI/MinionUIActionSelector";
            if (limb == typeof(Feet))
            {
                prefab = "UI/MinionUI/MinionUIActionSelectorFeet";
            }
            else if (limb == typeof(Arms))
            {
                prefab = "UI/MinionUI/MinionUIActionSelectorArms";
            }
            else if (limb == typeof(Brain))
            {
                prefab = "UI/MinionUI/MinionUIActionSelectorBrain";
            }
            else if (limb == typeof(Eyes))
            {
                prefab = "UI/MinionUI/MinionUIActionSelectorEyes";
            }

            this.CloseSelectors();
            GameObject objectUI = Instantiate(
                Resources.Load(prefab),
                this.transform.position,
                Quaternion.identity
            ) as GameObject;

            objectUI.transform.SetParent(GameObject.Find("DifferentialImageHolder").transform);
            objectUI.GetComponent<RectTransform>().anchoredPosition = Vector2.zero;
            objectUI.transform.localScale = new Vector3(0.8f, 1.6f, 1.0f);

            ActionSelector actionSelector = objectUI.GetComponent<ActionSelector>();
            if (actionSelector == null)
            {
                actionSelector = objectUI.AddComponent<ActionSelector>();
            }

            actionSelector.LimbType = limb;
            actionSelector.Minion = this.minions[this.currentMinionIdx];
        }
        // Not yet fully implemented, will be when all input is collected in a designated script.
        private void OnMinionChanged(MinionChangedEvent e)
        {
            
            if(e.Direction < 0)
            {
                NextMinionLeft();
            }
            else if(e.Direction > 0)
            {
                NextMinionRight();
            }

            this.UpdateIcons(false);
            this.UpdateLimbs();
            this.UpdateOutline();
        }

        private void OnMinionDeactivated(MinionDeactivatedEvent e)
        {
            this.OnMinionKilled(new MinionKilledEvent()
            {
                Minion = e.Minion,
            });
        }

        private void OnMinionKilled(MinionKilledEvent e)
        {
            if (currentMinionIdx != 0)
                NextMinionRight();
            else
                NextMinionLeft();
            this.RemoveMinion(e.Minion.GetComponent<Minion>());
            this.UpdateIcons(false);
            this.UpdateLimbs();
            this.UpdateOutline();
            GenericScripts.Events.EventHandler.Instance.Raise(new MinionRemovedEvent()
            {
                minionRemoved = 1
            });
            if (minions.Count == 0)
            {
                return;
            }
            if(currentMinionIdx != 0)
            {
                GenericScripts.Events.EventHandler.Instance.Raise(new CurrentMinionChangedEvent()
                {
                    minion = minions[this.currentMinionIdx],
                    currentMinionID = currentMinionIdx
                });
            }
            else if(currentMinionIdx == 0)
            {
                GenericScripts.Events.EventHandler.Instance.Raise(new CurrentMinionChangedEvent()
                {
                    minion = minions[this.currentMinionIdx],
                    currentMinionID = currentMinionIdx
                });
            }


        }
        private async void OnLimbSelected(LimbSelectedEvent e)
        {
            if (this == null)
            {
                return;
            }

            await Task.Delay(100);

            this.isUpgradingLimb = false;
            this.isDowngradingLimb = false;

            if (e.Event == LimbSelectedEvent.EventEnum.Upgrade)
            {
                this.AddMinion(e.Minion);
              
                if(e.LimbType == typeof(Feet))
                {
                    this.transform.GetChild(currentMinionIdx).GetComponent<Animator>().Play("FeetAdded");
                }
                if (e.LimbType == typeof(Arms))
                {
                    this.transform.GetChild(currentMinionIdx).GetComponent<Animator>().Play("ArmsAdded");
                }
                if (e.LimbType == typeof(Brain))
                {
                    this.transform.GetChild(currentMinionIdx).GetComponent<Animator>().Play("BrainAdded");
                }
                if (e.LimbType == typeof(Eyes))
                {
                    this.transform.GetChild(currentMinionIdx).GetComponent<Animator>().Play("EyesAdded");
                }

                GenericScripts.Events.EventHandler.Instance.Raise(new MinionAddedEvent()
                {
                    minionAdded = minions.Count
                });
            }
            else if (e.Event == LimbSelectedEvent.EventEnum.Downgrade && e.Minion.Limbs.Count == 0)
            {
                this.RemoveMinion(e.Minion);
                GenericScripts.Events.EventHandler.Instance.Raise(new MinionRemovedEvent()
                {
                    minionRemoved = 1
                });
                if (currentMinionIdx == minions.Count)
                    NextMinionLeft();
            }

            this.UpdateIcons(false);
            this.UpdateLimbs();
            this.UpdateOutline();
        }

        private void OnActionSelected(ActionSelectedEvent e)
        {
            if (this == null)
            {
                return;
            }

            this.UpdateIcons(false);
            this.UpdateLimbs();
            this.UpdateOutline();
            this.CloseSelectors();
        }
        private void HideIcon()
        {
            this.transform.GetChild(this.currentMinionIdx).gameObject.SetActive(false);
        }
        private void AddMinion(Minion minion)
        {
            if (minion == null || this.minions.Contains(minion))
            {
                return;
            }
            //this.currentMinionIdx = minions.Count;
            if (currentMinionIdx != minions.Count -1 && minions.Count!=0)
            {
                this.minions.Insert(currentMinionIdx + 1, minion);
                currentMinionIdx = currentMinionIdx + 1;
            }
            else if(currentMinionIdx == minions.Count-1 || minions.Count== 0)
            {
                this.minions.Add(minion);
                currentMinionIdx = minions.Count -1;
            }


            GameObject minionIcon = Instantiate(
                Resources.Load("UI/MinionUI/MinionIcon"),
                this.transform.position,
                Quaternion.identity
            ) as GameObject;

            this.minionIcons.Add(minionIcon);

            minionIcon.transform.SetParent(this.transform);
            minionIcon.transform.localScale = new Vector3(1.5f, 1.5f, 1.0f);
            minionIcon.transform.localPosition = new Vector3(0,0,0);
            this.UpdateIcons(true);
            GenericScripts.Events.EventHandler.Instance.Raise(new CurrentMinionChangedEvent()
            {
                minion = minions[this.currentMinionIdx],
                currentMinionID = this.currentMinionIdx
            });
            GenericScripts.Events.EventHandler.Instance.Raise(new MinionAddedEvent()
            {
                minionAdded = minions.Count
            });

        }
        
        

        private void RemoveMinion(Minion minion)
        {
            if (minion == null || !this.minions.Contains(minion))
            {
                return;
            }
            GameObject.Destroy(this.minionIcons[this.minions.IndexOf(minion)]);
            this.minionIcons.RemoveAt(this.minions.IndexOf(minion));
            this.minions.Remove(minion);

            /*minion.gameObject.AddComponent<MinionEnergyReturn>();*/

            ActiveOutline outline = minion.GetComponent<ActiveOutline>();
            if (outline != null)
            {
                Destroy(minion.GetComponent<ActiveOutline>());
            }
        }
        // Må endres
        private void UpdateIcons(bool newMinion)
        {
            foreach (Transform trans in this.transform)
            {
                if (!trans.name.Contains("MinionHUD"))
                {
                    continue;
                }

                trans.gameObject.SetActive(false);
                if (trans.childCount > 4)
                {
                    Destroy(trans.GetChild(4).gameObject);
                }
            }
            for (int i = 0; i < this.minions.Count; i++)
            {
                if (i >= this.transform.childCount)
                {
                    break;
                }
                Minion minion = this.minions[i];
                if(newMinion && i == currentMinionIdx)
                {

                    this.ActivateIcon(minion, i, newMinion);
                }else 
                    this.ActivateIcon(minion, i, newMinion);
            }
        }
        // Må endres
        private void ActivateIcon(Minion minion, int idx, bool newMinion)
        {

            if (minion == null ||
                idx >= this.transform.childCount)
            {
                return;
            }
            
            this.transform.GetChild(idx).gameObject.SetActive(true);
            if (this.transform.GetChild(idx).GetChild(1).Find("Screen").transform.childCount != 0 && !newMinion)
            {
                return;
            }


            GameObject screenIcon;
            if (this.transform.GetChild(idx).GetChild(1).GetChild(0).childCount != 0)
            {
                Destroy(this.transform.GetChild(idx).GetChild(1).GetChild(0).GetChild(0).gameObject);
            } else
            screenIcon = new GameObject("screenIcon");

            // This switch needs to be expanded as more objects get added to the game.
            // Ikke switch, blir for stor, kanskje en Dictionary
            if (minion.name.Contains("Tree"))
            {
                screenIcon = (GameObject)Resources.Load("Prefabs/HUD/MinionIcons/TreeHudIcon", typeof(GameObject));
            }
            else if (minion.name.Contains("Rock"))
            {
                screenIcon = (GameObject)Resources.Load("Prefabs/HUD/MinionIcons/StoneHudIcon", typeof(GameObject));
            }
            else if (minion.name.Contains("Cactus"))
            {
                screenIcon = (GameObject)Resources.Load("Prefabs/HUD/MinionIcons/CactusHudIcon", typeof(GameObject));
            }
            else if (minion.name.Contains("Trashcan"))
            {
                screenIcon = (GameObject)Resources.Load("Prefabs/HUD/MinionIcons/Trashcan", typeof(GameObject));
            }
            else if (minion.name.Contains("Outhouse"))
            {
                screenIcon = (GameObject)Resources.Load("Prefabs/HUD/MinionIcons/Outhouse", typeof(GameObject));
            }
            else if (minion.name.Contains("Cauldron"))
            {
                screenIcon = (GameObject)Resources.Load("Prefabs/HUD/MinionIcons/Cauldron", typeof(GameObject));
            }
            else if (minion.name.Contains("RedBarrel"))
            {
                screenIcon = (GameObject)Resources.Load("Prefabs/HUD/MinionIcons/RedBarrel", typeof(GameObject));
            }
            else
                    screenIcon = (GameObject)Resources.Load("Prefabs/HUD/MinionIcons/StoneHudIcon", typeof(GameObject));

            GameObject hudIcon = GameObject.Instantiate(screenIcon);
            hudIcon.transform.SetParent(this.transform.GetChild(idx).GetChild(1).GetChild(0));
            hudIcon.transform.localPosition = Vector3.zero;
            hudIcon.transform.localScale = new Vector3(1.0f, 1.0f, 1.0f);
        }
        //Må endres
        private void NextMinionLeft()
        {
            if (this.minions == null || this.minions.Count <= 0)
            {
                return;
            }

            this.CloseSelectors();

            if (this.currentMinionIdx <= 0)
            {
                this.currentMinionIdx = this.minions.Count - 1;
            }
            else
            {
                this.currentMinionIdx -= 1;
            }
            this.UpdateOutline();
            this.CloseSelectors();
            GenericScripts.Events.EventHandler.Instance.Raise(new CurrentMinionChangedEvent()
            {
                minion = minions[this.currentMinionIdx],
                currentMinionID = this.currentMinionIdx
            });
        }
        //Må endres
        private void NextMinionRight()
        {
            if (this.minions == null || this.minions.Count == 0)
            {
                return;
            }

            this.CloseSelectors();

            if (this.currentMinionIdx >= this.minions.Count - 1)
            {
                this.currentMinionIdx = 0;
            }
            else
            {
                this.currentMinionIdx += 1;
            }

            this.UpdateOutline();
            this.CloseSelectors();
            GenericScripts.Events.EventHandler.Instance.Raise(new CurrentMinionChangedEvent()
            {
                minion = this.minions[this.currentMinionIdx],
                currentMinionID = this.currentMinionIdx

            });
        }

        private void UpdateOutline()
        {
            if (this.currentMinionIdx < 0 || this.currentMinionIdx >= this.minions.Count)
            {
                return;
            }

            Minion currentMinion = this.minions[this.currentMinionIdx];
            if (currentMinion == null)
            {
                return;
            }

            foreach (Minion minion in this.minions)
            {
                if (minion == currentMinion)
                {
                    if (currentMinion.GetComponent<ActiveOutline>() == null)
                    {
                        currentMinion.gameObject.AddComponent<ActiveOutline>();
                    }
                    continue;
                }

                Destroy(minion.gameObject.GetComponent<ActiveOutline>());
            }
        }

        private void CloseSelectors()
        {
            GenericScripts.Events.EventHandler.Instance.Raise(new CancelEvent());
        }

        private void UpdateLimbs()
        {
            
            for (int i = 0; i < this.minions.Count; i++)
            {
                if (i >= this.minions.Count || i >= this.transform.childCount)
                {
                    continue;
                }

                Minion minion = this.minions[i];
                if (minion == null)
                {
                    continue;
                }

                Transform child = this.transform.GetChild(i);
                if (!child.gameObject.activeSelf)
                {
                    continue;
                }

                if (minion.GetComponent<Feet>() != null)
                {
                    child.GetChild(3).gameObject.SetActive(true);
                }
                else
                {
                    child.GetChild(3).gameObject.SetActive(false);
                }

                if (minion.GetComponent<Arms>() != null)
                {
                    child.GetChild(5).gameObject.SetActive(true);
                }
                else
                {
                    child.GetChild(5).gameObject.SetActive(false);
                }

                if (minion.GetComponent<Brain>() != null)
                {
                    child.GetChild(7).gameObject.SetActive(true);
                }
                else
                {
                    child.GetChild(7).gameObject.SetActive(false);
                }

                if (minion.GetComponent<Eyes>() != null)
                {
                    child.GetChild(9).gameObject.SetActive(true);
                }
                else
                {
                    child.GetChild(9).gameObject.SetActive(false);
                }
            }
        }
    }
}
