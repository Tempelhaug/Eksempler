using System.Collections;
using UnityEngine;
using InControl;
using Lucidum.Pareidolia.GameScripts.Actors;
using Lucidum.Pareidolia.GameScripts.Cameras;
using Lucidum.Pareidolia.GameScripts.Actors.Player;
using Lucidum.Pareidolia.GameScripts.Actors.Events;
using Lucidum.Pareidolia.GenericScripts.Events;
using Lucidum.Pareidolia.GenericScripts.Data;
using Lucidum.Pareidolia.GenericScripts;
using System.Collections.Generic;
using UnityEngine.AI;

public class Blink : MonoBehaviour
{

    private string _spawnPointPrefab = "Prefabs/Blink/BlinkPoint";

    private Actor actor;
    private Actor Actor
    {
        get
        {
            if (this.actor == null)
            {
                this.actor = gameObject.GetComponent<Actor>();
            }
            return this.actor;
        }
    }

    private InputDevice _controller;
    private bool _isBlinking = false;
    public bool beamInactive = false;

    [SerializeField]
    private int _blinkRange = 1;
    [SerializeField]
    private int _blinkCost;
    [SerializeField]
    private float _blinkHeight = 1;
    [SerializeField]
    private float _timeToBlink = 0.2f;
    [SerializeField]
    private float _blinkCooldown = 1f;
    [SerializeField]
    GameObject _startEffect;
    [SerializeField]
    GameObject _endEffect;


    void Start()
    {
        if (this.Actor == null)
        {
            throw new MissingComponentException("Missing actor");
        }
        _controller = InputManager.ActiveDevice;
        _blinkCost = RemoteSettings.GetInt("BlinkEnergyCost", 5);
    }

    void Update()
    {
        _controller = InputManager.ActiveDevice;
        //TODO: Legg til nullsjekk på controller
        //TODO: flytt contorller hit, slik at koble til kontroller på nytt funker.
        if ((_controller.Action3) && !_isBlinking && Time.timeScale != 0 && this.Actor.IsActive)
        {
            Vector3 dir;
            if (_controller.LeftStickX == 0 && _controller.LeftStickY == 0)
            {
                dir = transform.forward;
            } else
            {
                dir = (_controller.LeftStickX * new Vector3(1, 0, 0) + _controller.LeftStickY * new Vector3(0, 0, 1));
            }

            dir = dir.normalized;           
            StartCoroutine(BlinkInDirection(dir, _blinkCost));
        }
    }
    /// <summary>
    /// Checks if the targeted blink location has an acceptable y lvl, and if not, shortens the range of the blink. Will also check if there is a valid path to a blink position, so that it is possible to blink up "stairs".
    /// </summary>
    /// <param name="blinkPosition"></param>
    /// <param name="dir"></param>
    /// <returns></returns>
    private Vector3 checkBlinkRange(Vector3 finalBlinkPosition, Vector3 currentBlinkPosition, Vector3 dir, float blinkRange)
    {
        Vector3 newBlinkPosition;
        Terrain terrain = Misc.GetClosestCurrentTerrain(this.transform.position);
        float currentBlinkHeight = terrain.SampleHeight(finalBlinkPosition) - terrain.SampleHeight(currentBlinkPosition);
        if (currentBlinkHeight < _blinkHeight)
        {
            //The orignal blink position, no problems with blinking max range
            return finalBlinkPosition;
        } else
        {
            for (int i = 0; i < blinkRange * 2; i++)
            {
                newBlinkPosition = currentBlinkPosition + (blinkRange - (i / 2)) * dir;
                currentBlinkHeight = terrain.SampleHeight(newBlinkPosition) - terrain.SampleHeight(currentBlinkPosition);
                if (currentBlinkHeight < _blinkHeight)
                {
                    blinkRange = _blinkRange - (blinkRange - (i / 2));
                    if (blinkRange > 0)
                    {
                        newBlinkPosition = checkBlinkRange(finalBlinkPosition, newBlinkPosition, dir, blinkRange);
                    }
                    return newBlinkPosition;
                }
            }
            //No new blinkpositions found, blink set to minimum
            return currentBlinkPosition;
        }

    }
    /// <summary>
    /// Blinks the target in a direction for a given cost.
    /// </summary>
    /// <param name="dir"></param>
    /// <param name="cost"></param>
    /// <returns></returns>
    public IEnumerator BlinkInDirection(Vector3 dir, int cost)
    {
        Renderer[] renderers = gameObject.GetComponentsInChildren<Renderer>(true);
        Collider[] colliders = gameObject.GetComponentsInChildren<Collider>(true);

        this.gameObject.GetComponent<NavMeshAgent>().enabled = false;
        this.gameObject.transform.GetComponent<Player>().RespawnPosition = this.transform.position;
        this.gameObject.GetComponent<NavMeshAgent>().enabled = true;
        Abilities abilities = gameObject.GetComponent<Abilities>();
        if (this.Actor.Energy.CurrentVal >= cost && abilities &&
                abilities.HasUnlockedAbility(typeof(Abilities.Blink), 0))
        {
            // Performs blink
            _isBlinking = true;
            beamInactive = true;
            foreach (Renderer renderer in renderers)
            {
                if (renderer == null)
                {
                    continue;
                }
                renderer.enabled = false;
            }
            // foreach (Collider col in colliders)
            // {
            //     col.enabled = false;
            // }
            AkSoundEngine.PostEvent("PlayerTeleportEvent", gameObject);

            EventHandler.Instance.Raise(new UpdateStats()
            {
                Actor = this.Actor,
                Energy = new Stat()
                {
                    MaxVal = this.Actor.Energy.MaxVal,
                    CurrentVal = this.Actor.Energy.CurrentVal - cost
                }
            });

            Terrain terrain = Misc.GetClosestCurrentTerrain(this.transform.position);

            //Check for terrain along blinkpath
            //Check the blinklenght, is the y lvl acceptable blink, if not, lower the range
            Vector3 blinkToPosition = transform.position + _blinkRange * dir;
            blinkToPosition = checkBlinkRange(blinkToPosition, transform.position, dir, _blinkRange);
            blinkToPosition.y = terrain.SampleHeight(blinkToPosition);
            // GameObject start = Instantiate(_startEffect, transform.position, transform.rotation);
            // start.transform.localScale = new Vector3(0.25f, 0.25f, 0.25f);
            transform.position = blinkToPosition;

            GameObject end = Instantiate(_endEffect);
            end.transform.localScale = new Vector3(0.25f, 0.25f, 0.25f);
            end.transform.position = blinkToPosition + new Vector3(0, 0.5f, 0);

            // Lerp camera into position
            CameraFollow cf = Camera.main.GetComponent<CameraFollow>();
            StartCoroutine(cf.LerpToPosition(blinkToPosition, _timeToBlink));
            // Wait until blink is done

            yield return new WaitForSeconds(_timeToBlink);

            // Done blinking, movement activated
            // Destroy(start);
            Destroy(end);
            this.transform.GetComponent<NavMeshAgent>().enabled = false;
            transform.position = blinkToPosition;
            this.transform.GetComponent<NavMeshAgent>().enabled = true;
            foreach (Renderer renderer in renderers)
            {
                if (renderer == null)
                {
                    continue;
                }
                renderer.enabled = true;
            }
            // foreach (Collider col in colliders)
            // {
            //     col.enabled = true;
            // }
            beamInactive = false;

            // Internal cooldown before next blink is ready
            yield return new WaitForSeconds(_blinkCooldown);

            _isBlinking = false;
        }
    }
}

