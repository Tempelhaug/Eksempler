using UnityEngine;
using InControl;
using Lucidum.Pareidolia.GameScripts.Gameplay.Input.InputEvents;
using Lucidum.Pareidolia.GameScripts.Actors.Events;
using Lucidum.Pareidolia.GameScripts.Gameplay.Beam;
using Lucidum.Pareidolia.GameScripts.Actors.Minions;
using Lucidum.Pareidolia.GameScripts.Actors.Minions.Limbs;
using UnityEngine.UI;
using Lucidum.Pareidolia.GameScripts.Input;
using Lucidum.Pareidolia.GenericScripts.Events;
using Lucidum.Pareidolia.GameScripts.Events.Actors;
using Lucidum.Pareidolia.GameScripts.Actors.Minions.Events;

namespace Lucidum.Pareidolia.GameScripts.Actors.Player
{
    public class DirectControlOfMinion : MonoBehaviour
    {

        private InputDevice _activeDevice;
        private CurrentlyControlledEntity _currentEntity;

        private Actor player;
        private Actor Player
        {
            get
            {
                if (this.player == null)
                {
                    this.player = GameObject.FindObjectOfType(typeof(Player)) as Player;
                }
                return this.player;
            }
        }

        private Actor _currentMinion;

        private enum CurrentlyControlledEntity
        {
            Player,
            Minion
        }

        private void OnEnable()
        {
            EventHandler.Instance.AddListener<ChangeFromPlayerToMinionEvent>(this.OnChangeFromPlayerToMinionEvent);
            EventHandler.Instance.AddListener<CurrentMinionChangedEvent>(this.OnCurrentMinionChangedEvent);
            EventHandler.Instance.AddListener<ActivateSpecialAbilityEvent>(this.OnActivateSpecialAbility);
            EventHandler.Instance.AddListener<MinionKilledEvent>(this.OnMinionKilled);
            EventHandler.Instance.AddListener<DeathEvent>(this.OnActorDeath);
            EventHandler.Instance.AddListener<LoseMinionControlEvent>(this.OnLoseMinionControl);
        }

        private void OnDisable()
        {
            EventHandler.Instance.RemoveListener<ChangeFromPlayerToMinionEvent>(this.OnChangeFromPlayerToMinionEvent);
            EventHandler.Instance.RemoveListener<CurrentMinionChangedEvent>(this.OnCurrentMinionChangedEvent);
            EventHandler.Instance.RemoveListener<ActivateSpecialAbilityEvent>(this.OnActivateSpecialAbility);
            EventHandler.Instance.RemoveListener<MinionKilledEvent>(this.OnMinionKilled);
            EventHandler.Instance.RemoveListener<DeathEvent>(this.OnActorDeath);
            EventHandler.Instance.RemoveListener<LoseMinionControlEvent>(this.OnLoseMinionControl);
        }

        // Use this for initialization
        void Start()
        {
            _activeDevice = InputManager.ActiveDevice;
            _currentEntity = CurrentlyControlledEntity.Player;

            if (this.Player == null)
            {
                throw new MissingReferenceException("Missing player");
            }
        }

        // Update is called once per frame
        void Update()
        {
            _activeDevice = InputManager.ActiveDevice;
        }

        private void OnActivateSpecialAbility(ActivateSpecialAbilityEvent e)
        {
            if (_currentMinion != null && _currentEntity == CurrentlyControlledEntity.Minion)
            {
                if (_currentMinion.GetComponent<ExplodeOnDeath>() == null)
                {
                    return;
                }
                SwitchControlledEntity();

                GenericScripts.Events.EventHandler.Instance.Raise(new SpecialAbility
                {
                    Minion = _currentMinion
                });

            }
        }
        private void OnChangeFromPlayerToMinionEvent(ChangeFromPlayerToMinionEvent e)
        {
            SwitchControlledEntity();
        }

        private void OnLoseMinionControl(LoseMinionControlEvent e)
        {
            this.SwitchFromMinionToPlayer();
        }

        private void OnActorDeath(DeathEvent e)
        {
            if (!(e.Actor is Player))
            {
                return;
            }

            this.SwitchFromMinionToPlayer();
        }

        private void OnMinionKilled(MinionKilledEvent e)
        {
            if (e.Minion != this._currentMinion || this._currentEntity == CurrentlyControlledEntity.Player)
            {
                return;
            }

            this.SwitchControlledEntity();
        }

        private void OnCurrentMinionChangedEvent(CurrentMinionChangedEvent e)
        {
            if (e.minion == null)
            {
                return;
            }
            if (_currentEntity == CurrentlyControlledEntity.Player)
            {
                _currentMinion = e.minion;
            }
            if (_currentEntity == CurrentlyControlledEntity.Minion)
            {
                SwitchBetweenControlledMinions(e.minion);
                _currentMinion = e.minion;
            }
        }
        /// <summary>
        /// If controlling a minion and the user wants to change minion this will disable components on the previous minion and enable them on the new one in order to control it correctly
        /// </summary>
        /// <param name="nextMinion"></param>
        private void SwitchBetweenControlledMinions(Actor nextMinion)
        {
            if (_currentEntity == CurrentlyControlledEntity.Player)
            {
                return;
            }
            else if (_currentEntity == CurrentlyControlledEntity.Minion)
            {
                if (_currentMinion.GetComponent<UserControlledMovement>() != null)
                {
                    _currentMinion.GetComponent<UserControlledMovement>().enabled = false;
                }
                if (nextMinion.GetComponent<UserControlledMovement>() != null)
                {
                    nextMinion.GetComponent<UserControlledMovement>().enabled = true;
                }
                // nextMinion.gameObject.AddComponent<MinionAbilities>();
                GenericScripts.Events.EventHandler.Instance.Raise(new ControlledEntityChangedEvent()
                {
                    controlledEntity = nextMinion
                });
            }
        }
        /// <summary>
        /// If controlling the player, switches to controlling the current minion. Responsible for enabling the required components on the minion in order to control it correctly
        /// </summary>
        private void SwitchControlledEntity()
        {
            if (_currentEntity == CurrentlyControlledEntity.Player)
            {
                if (_currentMinion == null)
                {
                    return;
                }
                if (_currentMinion.GetComponent<Feet>() == null && _currentMinion.GetComponent<Arms>() == null && _currentMinion.GetComponent<Brain>() == null && _currentMinion.GetComponent<Eyes>() == null)
                {
                    return;
                }
                this.Player.GetComponent<UserControlledMovement>().enabled = false;
                this.Player.GetComponent<BeamEmitter>().enabled = false;
                this.Player.GetComponent<Blink>().enabled = false;
                if (_currentMinion.GetComponent<UserControlledMovement>() != null)
                {
                    _currentMinion.GetComponent<UserControlledMovement>().enabled = true;
                }
                _currentEntity = CurrentlyControlledEntity.Minion;
                EventHandler.Instance.Raise(new UnlockActorEvent() { Actor = _currentMinion });
                // _currentMinion.gameObject.AddComponent<MinionAbilities>();
                GenericScripts.Events.EventHandler.Instance.Raise(new ControlledEntityChangedEvent()
                {
                    controlledEntity = _currentMinion
                });
            }
            else if (_currentEntity == CurrentlyControlledEntity.Minion)
            {
                this.SwitchFromMinionToPlayer();
            }
        }

        private void SwitchFromMinionToPlayer()
        {
            if (this.Player == null)
            {
                return;
            }

            this.Player.GetComponent<UserControlledMovement>().enabled = true;
            this.Player.GetComponent<BeamEmitter>().enabled = true;
            this.Player.GetComponent<Blink>().enabled = true;
            if (this._currentMinion)
            {
                if (this._currentMinion.GetComponent<UserControlledMovement>() != null)
                {
                    this._currentMinion.GetComponent<UserControlledMovement>().enabled = false;
                }
            }

            _currentEntity = CurrentlyControlledEntity.Player;
            GenericScripts.Events.EventHandler.Instance.Raise(new ControlledEntityChangedEvent()
            {
                controlledEntity = this.Player
            });
        }
    }
}
