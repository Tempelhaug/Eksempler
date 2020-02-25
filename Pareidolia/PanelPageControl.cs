using Lucidum.Pareidolia.GameScripts.Actors.Events;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;


namespace Lucidum.Pareidolia.GameScripts.Actors.UI
{
    public class PanelPageControl : MonoBehaviour
    {
        private void OnEnable()
        {
            GenericScripts.Events.EventHandler.Instance.AddListener<CurrentMinionChangedEvent>(this.OnCurrentMinionChangedEvent);
            GenericScripts.Events.EventHandler.Instance.AddListener<MinionAddedEvent>(this.OnMinionAddedEvent);
        }

        private void OnDisable()
        {
            GenericScripts.Events.EventHandler.Instance.RemoveListener<CurrentMinionChangedEvent>(this.OnCurrentMinionChangedEvent);
            GenericScripts.Events.EventHandler.Instance.RemoveListener<MinionAddedEvent>(this.OnMinionAddedEvent);
        }
        private GameObject _activeMinionPanel;
        private GameObject _activeMinionPanelLeftNeighbour;
        private GameObject _activeMinionPanelRightNeighbour;
        private GameObject _activeMinionPanelRightRightNeighbour;
        private GameObject _activeMinionPanelLeftLeftNeighbour;
        private Color color;
        private bool _movingLeft = false;
        private bool _movingRight = false;
        private bool _cycling = false;
        private int _previousMinionID = -1;

        // Use this for initialization
        void Start()
        {

        }

        // Update is called once per frame
        void Update()
        {
         
        }
        private void OnMinionAddedEvent(MinionAddedEvent e)
        {
            this.transform.GetChild(_previousMinionID).GetComponent<Animator>().Play("MinionAdded");
            
  
        }
        private void OnCurrentMinionChangedEvent(CurrentMinionChangedEvent e)
        {
            if(e.currentMinionID < 0 || e.currentMinionID >= this.transform.childCount || e.currentMinionID == -1)
            {
                return;
            }
            if(_previousMinionID == -1)
            {

            }
            if ((_previousMinionID < e.currentMinionID ) || (_previousMinionID== this.transform.childCount -1 && e.currentMinionID == 0 && this.transform.childCount > 2))
            {
                _movingLeft = true;
                _movingRight = false;
                if(_previousMinionID == 0 && e.currentMinionID == this.transform.childCount - 1 && this.transform.childCount > 2)
                {
                    _movingLeft = false;
                    _movingRight = true;
                }
            }else if((_previousMinionID > e.currentMinionID) || (_previousMinionID == 0 && e.currentMinionID == this.transform.childCount-1 && this.transform.childCount > 2))
            {
                _movingLeft = false;
                _movingRight = true;
            }
            if(((_previousMinionID == 0 && _movingLeft) || (_previousMinionID == this.transform.childCount - 1 && _movingRight)) && e.currentMinionID != _previousMinionID && (Mathf.Abs(e.currentMinionID - _previousMinionID) != 1))
            {
                _cycling = false;
            } else
            {
                _cycling = false;
            }

            _activeMinionPanelRightNeighbour = null;
            _activeMinionPanelLeftNeighbour = null;
            _activeMinionPanelLeftLeftNeighbour = null;
            _activeMinionPanelRightRightNeighbour = null;

            foreach (Transform child in this.transform)
                ResetPositionOfPanel(child.gameObject);

            _previousMinionID = e.currentMinionID;
            UpdatePositionOfPanels(e.currentMinionID);

        }

        private void UpdatePositionOfPanels(int currentMinionID)
        {
            if (this.transform.GetChild(currentMinionID).gameObject == null)
            {
                return;
            }
            _activeMinionPanel = this.transform.GetChild(currentMinionID).gameObject;

            Animator activeMinionAnimator = _activeMinionPanel.GetComponent<Animator>();
            if (_movingLeft && !_cycling)
            {
                if(currentMinionID == this.transform.childCount - 1 && this.transform.childCount > 2)
                {
                    activeMinionAnimator.Play("RightIconMiddle");
                }
                else
                {
                    activeMinionAnimator.Play("RightIconMiddle");
                }
                
            }
            if (_movingRight && !_cycling)
            {
                if(currentMinionID == 0 && this.transform.childCount > 2)
                {
                    activeMinionAnimator.Play("LeftIconMiddle");
                }
                else
                {
                    activeMinionAnimator.Play("LeftIconMiddle");
                }
            }
            if (this.transform.childCount >= 1)
            {
               
                    if (currentMinionID == 0 && this.transform.childCount > 2)
                    {
                        _activeMinionPanelLeftNeighbour = this.transform.GetChild(this.transform.childCount-1).gameObject;
                    }
                    else if (currentMinionID == 0 && this.transform.childCount <= 2)
                    {
                    _activeMinionPanelLeftNeighbour = null;
                    }
                    else
                        _activeMinionPanelLeftNeighbour = this.transform.GetChild(currentMinionID - 1).gameObject;
                    if (currentMinionID >= this.transform.childCount - 1 && this.transform.childCount <= 2)
                    {
                        _activeMinionPanelRightNeighbour = null;
                    } else if (currentMinionID >= this.transform.childCount -1 && this.transform.childCount > 2){
                        _activeMinionPanelRightNeighbour = this.transform.GetChild(0).gameObject;
                    }
                    else
                        _activeMinionPanelRightNeighbour = this.transform.GetChild(currentMinionID + 1).gameObject;
                    if (this.transform.childCount <=3)
                    {
                        _activeMinionPanelLeftLeftNeighbour = null;
                    }
                    else if(currentMinionID == 1)
                {
                    _activeMinionPanelLeftLeftNeighbour = this.transform.GetChild(this.transform.childCount - 1).gameObject;
                }
                    else if(currentMinionID == 0)
                {
                    _activeMinionPanelLeftLeftNeighbour = this.transform.GetChild(this.transform.childCount-2).gameObject;
                }
                    else
                    {
                        _activeMinionPanelLeftLeftNeighbour = this.transform.GetChild(currentMinionID - 2).gameObject;
                    }
                    if (this.transform.childCount <= 3)
                    {
                        _activeMinionPanelRightRightNeighbour = null;
                    }
                    else if(currentMinionID == this.transform.childCount - 2)
                {
                    _activeMinionPanelRightRightNeighbour = this.transform.GetChild(0).gameObject;
                }
                    else if(currentMinionID == this.transform.childCount - 1)
                {
                    _activeMinionPanelRightRightNeighbour = this.transform.GetChild(1).gameObject;
                }
                    else
                    {
                        _activeMinionPanelRightRightNeighbour = this.transform.GetChild(currentMinionID + 2).gameObject;
                    }

                    if (_activeMinionPanel != null)
                    {
                        _activeMinionPanel.SetActive(true);
                    }
                 // If we are not cycling from first minion to last(or last minion to first) just move normal through the minions.
                if (true)
                {

                    if (_activeMinionPanelLeftNeighbour != null && _activeMinionPanelLeftNeighbour.GetComponent<Animator>() != null)
                    {
                        Animator leftAnimator = _activeMinionPanelLeftNeighbour.GetComponent<Animator>();
                        if (_movingLeft)
                        {
                            leftAnimator.Play("MiddleIconLeft");
                        }
                        else if (_movingRight && this.transform.childCount == 3)
                        {
                            leftAnimator.Play("RightCycleToLeft");
                        }
                        else if (_movingRight)
                        {
                            leftAnimator.Play("LeftIconInLeft");
                        }
                    }
                    if (_activeMinionPanelRightNeighbour != null && _activeMinionPanelRightNeighbour.GetComponent<Animator>() != null)
                    {
                        Animator rightAnimator = _activeMinionPanelRightNeighbour.GetComponent<Animator>();
                        if (_movingRight)
                        {
                            rightAnimator.Play("MiddleIconRight");

                        }
                        else if (_movingLeft && this.transform.childCount == 3)
                        {
                            rightAnimator.Play("LeftCycleToRight");
                        }
                        else if (_movingLeft)
                        {
                            rightAnimator.Play("RightIconInRight");
                        }
                    }
                    if (_activeMinionPanelLeftLeftNeighbour != null && _activeMinionPanelLeftLeftNeighbour.GetComponent<Animator>() != null)
                    {
                        Animator leftOffAnimator = _activeMinionPanelLeftLeftNeighbour.GetComponent<Animator>();
                        if (_movingLeft && this.transform.childCount > 3)
                        {
                            leftOffAnimator.Play("LeftIconOffLeft");
                        }
                    }
                    if (_activeMinionPanelRightRightNeighbour != null && _activeMinionPanelRightRightNeighbour.GetComponent<Animator>() != null)
                    {
                        Animator rightOffAnimator = _activeMinionPanelRightRightNeighbour.GetComponent<Animator>();
                        if (_movingRight && this.transform.childCount > 3)
                        {
                            rightOffAnimator.Play("RightIconOffRight");
                        }
                    }
                }
            }
            
        }
        private void ResetPositionOfPanel(GameObject panel)
        {
            panel.transform.localPosition = new Vector3(0,0,0);
            panel.transform.localScale = new Vector3(1.5f, 1.5f, 1);
            panel.transform.GetComponent<CanvasGroup>().alpha = 0;
        }
    }
}
