using Lucidum.Pareidolia.GameScripts.Actors;
using Lucidum.Pareidolia.GameScripts.Actors.Events;
using Lucidum.Pareidolia.GameScripts.GamePlay.Pickup;
using Lucidum.Pareidolia.GenericScripts.Events;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Lucidum.Pareidolia.GameScripts.Gameplay.Level
{
    public class LevelCheckpoint : MonoBehaviour
    {
        [Tooltip("Sets what type of checkpoint this is, do we need to kill certain enemies?, or do we need to pick up certain items, or do we just need to reach a specific area of the game")]
        [SerializeField]
        public CheckpointType typeOfCheckpoint;

        [Header("Required Enemies")]
        [Tooltip("Put the enemies that needs to be killed for a segment to end, leave empty if this segment doesnt require enemies killed.")]
        [SerializeField]
        private List<Actor> requiredEnemies;

        [Header("Required pickup")]
        [Tooltip("The items required to pick up for this segment, leave empty if segment doesnt require specific pickups")]
        [SerializeField]
        private GameObject pickup;

        [Header("Is this checkpoint the end of the level")]
        [Tooltip("Check if this checkpoint is the last of this level so we can load the next one")]
        [SerializeField]
        private bool lastCheckpointOfLevel;


        private void OnEnable()
        {
            EventHandler.Instance.AddListener<DeathEvent>(this.OnDeathEvent);
            EventHandler.Instance.AddListener<PickupEvent>(this.OnPickupEvent);
        }
        private void OnDisable()
        {
            EventHandler.Instance.RemoveListener<DeathEvent>(this.OnDeathEvent);
            EventHandler.Instance.RemoveListener<PickupEvent>(this.OnPickupEvent);
        }
        public enum CheckpointType
        {
            KillEnemies,
            ReachPoint,
            PickupItem
        }
        // Use this for initialization
        void Start()
        {
            if(typeOfCheckpoint == CheckpointType.KillEnemies)
            {
                if (requiredEnemies.Count == 0)
                {
                    Debug.LogError("If typeofCheckpoint is set to KillEnemies the requiredEnemies list cannot be empty, on Checkpoint:  " + this.transform.name);
                    requiredEnemies = null;
                    return;
                }
                pickup = null;
            }
            if(typeOfCheckpoint == CheckpointType.PickupItem)
            {
                if(pickup == null)
                {
                    Debug.LogError("If typeofCheckpoint is set to PickupItem the pickup filed cannot be empty, on checkpoint: " + this.transform.name);
                    return;
                }
                requiredEnemies = null;

            }
            if(typeOfCheckpoint == CheckpointType.ReachPoint)
            {
                if (this.gameObject.GetComponent<Collider>() == null || !this.gameObject.GetComponent<Collider>().isTrigger)
                {
                    Debug.LogError("If typeofCheckpoint is set to ReachPoint the checkpointArea needs a collider attatched to the gameobject, on checkpoint: " + this.transform.name);
                    return;
                }
                requiredEnemies = null;
                pickup = null;
            }
        }
        
        // Update is called once per frame
        void Update()
        {

        }
        private void OnDeathEvent(DeathEvent e)
        {
            if (requiredEnemies == null || e.Actor == null || e.Actor.name  == "Player")
            {
                return;
            }
            if (requiredEnemies.Contains(e.Actor))
            {
                requiredEnemies.Remove(e.Actor);
            }
            if (requiredEnemies.Count == 0 && typeOfCheckpoint == CheckpointType.KillEnemies)
            {
                ConditionCompleted();
            }
        }
        private void OnPickupEvent(PickupEvent e)
        {
            if(e.pickupObject == pickup && typeOfCheckpoint == CheckpointType.PickupItem)
            {
                ConditionCompleted();
            }
        }
        private void OnTriggerEnter(Collider collision)
        {
            if (collision.gameObject.CompareTag("Player") && typeOfCheckpoint == CheckpointType.ReachPoint)
            {
                ConditionCompleted();
            } 
        }
        // Kan knaskje oppdatere respawnpunkt her senere også.
        private void ConditionCompleted()
        {
            EventHandler.Instance.Raise(new ToggleFeedbackEvent
            {
                Name = this.name
            });
            this.gameObject.SetActive(false);
            if (lastCheckpointOfLevel)
            {
                SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex + 1);
            }

        }
    }
}
