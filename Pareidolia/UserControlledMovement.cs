// <copyright file="UserControlledMovement.cs" company="Studio Lucidum AS">
// Copyright (c) Studio Lucidum AS. All rights reserved.
// </copyright>

namespace Lucidum.Pareidolia.GameScripts.Actors.Player
{
    using InControl;
    using Lucidum.Pareidolia.GameScripts.Actors.Minions;
    using Lucidum.Pareidolia.GameScripts.Actors.Minions.Limbs;
    using UnityEngine;
    using UnityEngine.AI;

    /// <summary>
    /// Component for handling input from the player, will set input source based on what inputsource was last detected in use, 
    /// ie. if input was detected on a connected PS4 controller this will be the currently active device.
    /// </summary>
    public class UserControlledMovement : MonoBehaviour
    {

        [SerializeField]
        private float _horizontal;
        [SerializeField]
        private float _vertical;
        [SerializeField]
        private float _rightHorizontal;
        [SerializeField]
        private float _rightVertical;

        private Vector3 _moveDirection;
        private float _moveSpeedMultiplier = 5;
        private float _stepHeight = 1;
        private bool onWalkableMinion = false;
        private Transform walkableMinion;

        private InputDevice controller;

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

        private RigidbodyConstraints constraints;

        // Use this for initialization
        void Start()
        {
            _horizontal = 0f;
            _vertical = 0f;
            _rightHorizontal = 0f;
            _rightVertical = 0f;

            if (this.Actor == null)
            {
                throw new MissingComponentException("Missing actor");
            }
        }

        private void OnEnable()
        {
            Rigidbody rb = transform.GetComponent<Rigidbody>();
            if (rb != null)
            {
                this.constraints = rb.constraints;
                rb.constraints = RigidbodyConstraints.FreezeRotation;
            }
        }

        private void OnDisable()
        {
            Animator[] animators = this.GetComponentsInChildren<Animator>();
            foreach (Animator animator in animators)
            {
                if (!Animations.Animation.HasParameter(animator, "Speed") ||
                    !Animations.Animation.HasParameter(animator, "BlendX"))
                {
                    continue;
                }
                animator.SetFloat("Speed", 0.0f);
                animator.SetFloat("BlendX", 0.0f);
            }
            Rigidbody rb = transform.GetComponent<Rigidbody>();
            if (rb != null)
            {
                rb.constraints = this.constraints;
            }
        }

        // Update is called once per frame
        void Update()
        {
            if (this.Actor == null)
            {
                return;
            }

            if (this.Actor is Minion && !((Minion)this.Actor).HasLimbOfType(typeof(Feet)))
            {
                return;
            }
            if (this.Actor.Locked)
            {
                this.UpdateAnimator(Vector3.zero, 0, 0);
                return;
            }
            if (Time.timeScale != 0)
            {
                controller = InputManager.ActiveDevice;
                _horizontal = controller.LeftStickX;
                _vertical = controller.LeftStickY;
                _moveDirection = (_horizontal * new Vector3(1, 0, 0) + _vertical * new Vector3(0, 0, 1));

                // Rotates the player based on the input read from the right joystick
                if ((controller.RightStickX != 0 || controller.RightStickY != 0) && !controller.Name.Equals("Keyboard/Mouse"))
                {
                    Rotate(controller.RightStickX, controller.RightStickY);
                }
                // Moves the player based on the input read from the left joystick.
                if (controller.LeftStickX != 0 || controller.LeftStickY != 0)
                {
                    Move(_moveDirection, _moveSpeedMultiplier);

                    // If no input is read from the right joystick the player will rotate based on the input read form the left joystick
                    if (controller.RightStickX == 0 && controller.RightStickY == 0)
                    {
                        Rotate(controller.LeftStickX, controller.LeftStickY);
                    }
                }
                UpdateAnimator(_moveDirection, _rightHorizontal, _rightVertical);


                // This clause makes sure that the mouse position will only rotate the character when the mousebutton is held down
                if (controller.Name.Equals("Keyboard/Mouse") && (controller.RightTrigger || controller.LeftTrigger))
                {
                    Vector3 position = transform.position;
                    Plane playerPlane = new Plane(Vector3.up, position);
                    Ray ray = UnityEngine.Camera.main.ScreenPointToRay(UnityEngine.Input.mousePosition);
                    float hitdist = 0.0f;
                    if (playerPlane.Raycast(ray, out hitdist))
                    {
                        Vector3 targetPoint = ray.GetPoint(hitdist);
                        _rightVertical = (targetPoint.z - position.z) / 20;
                        _rightHorizontal = (targetPoint.x - position.x) / 20;
                    }
                    Rotate(_rightHorizontal, _rightVertical);
                }
                else if (controller.Name.Equals("Keyboard/Mouse"))
                {
                    _rightVertical = 0;
                    _rightHorizontal = 0;
                }
                else if (!controller.Name.Equals("Keyboard/Mouse"))
                {
                    _rightHorizontal = controller.RightStickX;
                    _rightVertical = controller.RightStickY;
                }
            }

        }
        public void Rotate(float h, float v)
        {
            float angle = Mathf.Atan2(h, v) * Mathf.Rad2Deg;

            transform.rotation = Quaternion.Euler(new Vector3(0, angle, 0));
        }
        public void OnTriggerEnter(Collider other)
        {
            if (other.tag == "WalkableObject")
            {
                onWalkableMinion = true;
                walkableMinion = other.transform;
                this.transform.GetComponent<NavMeshAgent>().enabled = false;
            }
        }
        public void OnTriggerExit(Collider other)
        {
            if(other.tag == "WalkableObject")
            {
                onWalkableMinion = false;
                walkableMinion = null;

                this.transform.GetComponent<NavMeshAgent>().enabled = true;
            }
        }
        public void Move(Vector3 move, float moveSpeedMultiplier)
        {
            // float startStepHeight = float.MaxValue;
            // float nextStepHeight = float.MaxValue;

            // RaycastHit hit;
            // Ray downRay = new Ray(transform.position + new Vector3(0, 1, 0), Vector3.down);
            // if(Physics.Raycast(downRay, out hit))
            // {
            //     startStepHeight = hit.distance;
            // }

            // downRay = new Ray(transform.position + move * Time.deltaTime * moveSpeedMultiplier + new Vector3(0, 1, 0), Vector3.down);
            // if(Physics.Raycast(downRay, out hit))
            // {
            //     nextStepHeight = hit.distance;
            // }

            // float deltaStepHeight = Mathf.Abs(startStepHeight - nextStepHeight);
            // if (deltaStepHeight < this._stepHeight)
            // {
            transform.position += move * Time.deltaTime * moveSpeedMultiplier;
            // }
        }
        private void isStuck() { 
}
        /// <summary>
        /// Updates the animator based on parameters.
        /// </summary>
        /// <param name="move">The movement direction.</param>
        private void UpdateAnimator(Vector3 move, float h, float v) {
            Animator[] animators = this.GetComponentsInChildren<Animator>();
            if (h < 0.05 && h > -0.05 && v < 0.05 && v > -0.05) {
                //Special case for left stick because angle isn't calculated correctly when 
                //right stick is idle
                foreach (Animator animator in animators) {
                    if (animator == null || animator.runtimeAnimatorController == null)
                    {
                        continue;
                    }
                    if (!Animations.Animation.HasParameter(animator, "MoveX") ||
                        !Animations.Animation.HasParameter(animator, "MoveY"))
                    {
                        continue;
                    }
                    animator.SetFloat("MoveX", 0);
                    animator.SetFloat("MoveY", Mathf.Clamp(Mathf.Abs(move.x) + Mathf.Abs(move.z), -1.0f, 1.0f));
                }
            } else {
                float cameraAngle = Camera.main.transform.rotation.eulerAngles.y;
                float angle = Mathf.Atan2(h, v) * Mathf.Rad2Deg + (0 - cameraAngle);

                Vector3 move_ = new Vector3(move.x, move.y, move.z);
                move_ = Quaternion.Euler(0, -angle, 0) * move_;

                foreach (Animator animator in animators) {
                    if (animator == null || animator.runtimeAnimatorController == null)
                    {
                        continue;
                    }
                    if (!Animations.Animation.HasParameter(animator, "MoveX") ||
                        !Animations.Animation.HasParameter(animator, "MoveY"))
                    {
                        continue;
                    }
                    animator.SetFloat("MoveX", move_.x);
                    animator.SetFloat("MoveY", move_.z);
                }
            }
            foreach (Animator animator in animators)
            {
                if (Animations.Animation.HasParameter(animator, "Speed"))
                {
                    animator.SetFloat("Speed", move.magnitude);
                }
                if (Animations.Animation.HasParameter(animator, "BlendX"))
                {
                    animator.SetFloat("BlendX", move.magnitude);
                }
            }
        }
    }
}
