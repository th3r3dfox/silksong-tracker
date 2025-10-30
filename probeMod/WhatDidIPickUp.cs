using BepInEx;
using BepInEx.Configuration;
using BepInEx.Logging;
using HarmonyLib;
using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

[BepInPlugin("com.brickoyster.whatdidipickup", "WhatDidIPickUp", "1.0.0")]
public class WhatDidIPickUp : BaseUnityPlugin
{
    // Keybinds
    private ConfigEntry<KeyCode> _printJournalEntries;
    private ConfigEntry<KeyCode> _saveRestorePoint;

    // Logger
    internal static ManualLogSource logger;

    // Game data
    private List<EnemyJournalRecord> _allEnemies;
    internal static Dictionary<string, bool> persistentBools;
    internal static Dictionary<string, int> persistentInts;

    // Control vars
    internal static List<string> ignoredBools;
    internal static List<string> ignoredInts;
    internal static int lastRestore;
    internal static bool isManualRestore;

    private void Awake()
    {
        _printJournalEntries = base.Config.Bind("General", "Print Journal", KeyCode.Equals, "Key to dump all journal entries to console.");
        _saveRestorePoint = base.Config.Bind("General", "Save Restore Point", KeyCode.JoystickButton0, "Key to save a restore point.");

        logger = Logger;

        persistentBools = new Dictionary<string, bool>();
        persistentInts = new Dictionary<string, int>();
        _allEnemies = new List<EnemyJournalRecord>();

        ignoredBools = new List<string>() { "hasKilled", "disablePause", "disableInventory", "atBench", "isInvincible", };
        ignoredInts = new List<string>() { "previousDarkness", "currentInvPane", };
        lastRestore = -1;
        isManualRestore = false;

        Harmony.CreateAndPatchAll(typeof(WhatDidIPickUp), null);
        logger.LogInfo("Plugin loaded and initialized.");
    }

    // Force save restore point
    private void SaveRestorePoint()
    {
        isManualRestore = true;
        lastRestore += 1;

        // Create restore point
        GameManager.instance.CreateRestorePoint(AutoSaveName.NONE);
    }


    // Dump all journal enemies to console
    private void GetAllEnemies()
    {
        _allEnemies = EnemyJournalManager.GetAllEnemies();

        foreach (EnemyJournalRecord allEnemy in _allEnemies)
        {
            int kills = allEnemy.KillsRequired;
            string onlysteel = "";
            if (allEnemy.name.Equals("Abyss Mass"))
            {
                onlysteel = "\n  \"mode\": \"steel\",";
            }
            logger.LogInfo($"" +
                $"\n{{" +
                $"\n  \"act\": 1," +
                $"\n  \"description\": \"{allEnemy.Description.ToString().Replace("’", "\'")}\"," +
                $"\n  \"flag\": \"{allEnemy.name}\"," +
                $"\n  \"hornetDescription\": \"{allEnemy.Notes.ToString().Replace("’", "\'")}\"," +
                $"\n  \"icon\": \"journal/{allEnemy.DisplayName.ToString().Replace(" ", "_")}.png\"," +
                $"\n  \"id\": \"{allEnemy.DisplayName.ToString().ToLower().Replace(" ", "-")}\"," +
                $"\n  \"label\": \"{allEnemy.DisplayName}\"," +
                $"\n  \"link\": \"https://hollowknight.wiki/w/{allEnemy.DisplayName.ToString().Replace(" ", "_")}\"," +
                $"{onlysteel}" +
                $"\n  \"required\": {allEnemy.KillsRequired}," +
                $"\n  \"type\": \"journal\"" +
                $"\n}},");
        }
    }

    private void Update()
    {
        if (Input.GetKeyDown(_printJournalEntries.Value)) { StartCoroutine("GetAllEnemies"); }
        if (Input.GetKeyDown(_saveRestorePoint.Value)) { StartCoroutine("SaveRestorePoint"); }
    }

    // Track persistent bools
    private static void savePersistentBools(ref PersistentItemData<bool> newItemData)
    {
        var key = newItemData.SceneName + "_" + newItemData.ID;
        if (persistentBools.ContainsKey(key))
        {
            persistentBools[key] = newItemData.Value;
        }
        else
        {
            persistentBools.Add(key, newItemData.Value);
        }
    }

    [HarmonyPostfix]
    [HarmonyPatch(typeof(PersistentBoolItem), "TryGetValue")]
    private static void PostTryGetBool(PersistentBoolItem __instance, ref PersistentItemData<bool> newItemData)
    {
        savePersistentBools(ref newItemData);
    }

    [HarmonyPostfix]
    [HarmonyPatch(typeof(PersistentBoolItem), "SaveValue")]
    private static void PostSaveBool(PersistentBoolItem __instance, PersistentItemData<bool> newItemData)
    {
        var key = newItemData.SceneName + "_" + newItemData.ID;
        if (persistentBools.ContainsKey(key) && persistentBools[key] == newItemData.Value) { return; }
        logger.LogInfo($"\nPersistent Bool changed: [{newItemData.SceneName}][{newItemData.ID}] = {newItemData.Value}");
        savePersistentBools(ref newItemData);
    }

    // Track persistent ints
    private static void savePersistentInts(ref PersistentItemData<int> newItemData)
    {
        var key = newItemData.SceneName + "_" + newItemData.ID;
        if (persistentInts.ContainsKey(key))
        {
            persistentInts[key] = newItemData.Value;
        }
        else
        {
            persistentInts.Add(key, newItemData.Value);
        }
    }

    [HarmonyPostfix]
    [HarmonyPatch(typeof(PersistentIntItem), "TryGetValue")]
    private static void PostTryGetInt(PersistentIntItem __instance, ref PersistentItemData<int> newItemData)
    {
        savePersistentInts(ref newItemData);
    }

    [HarmonyPostfix]
    [HarmonyPatch(typeof(PersistentIntItem), "SaveValue")]
    private static void PostSaveInt(PersistentIntItem __instance, PersistentItemData<int> newItemData)
    {
        var key = newItemData.SceneName + "_" + newItemData.ID;
        if (persistentInts.ContainsKey(key) && persistentInts[key] == newItemData.Value) { return; }
        logger.LogInfo($"\nPersistent Int changed: [{newItemData.SceneName}][{newItemData.ID}] = {newItemData.Value}");
        savePersistentInts(ref newItemData);
    }

    // Print player data changes
    [HarmonyPostfix]
    [HarmonyPatch(typeof(PlayerData), "SetBool")]
    private static void PostSetBool(PlayerData __instance, string boolName, bool value)
    {
        if (ignoredBools.Contains(boolName)) { return; }
        logger.LogInfo($"\nPlayerData SetBool: {boolName} = {value}");
    }

    [HarmonyPostfix]
    [HarmonyPatch(typeof(PlayerData), "SetInt")]
    private static void PostSetInt(PlayerData __instance, string intName, int value)
    {
        if (ignoredInts.Contains(intName)) { return; }
        logger.LogInfo($"\nPlayerData SetInt: {intName} = {value}");
    }

    [HarmonyPostfix]
    [HarmonyPatch(typeof(PlayerData), "SetFloat")]
    private static void PostSetFloat(PlayerData __instance, string floatName, float value)
    {
        logger.LogInfo($"\nPlayerData SetFloat: {floatName} = {value}");
    }

    [HarmonyPostfix]
    [HarmonyPatch(typeof(PlayerData), "SetString")]
    private static void PostSetString(PlayerData __instance, string stringName, string value)
    {
        logger.LogInfo($"\nPlayerData SetString: {stringName} = {value}");
    }

    // Print quest info
    [HarmonyPostfix]
    [HarmonyPatch(typeof(QuestManager), "ShowQuestAccepted")]
    private static void PostShowQuestAccepted(QuestManager __instance, FullQuestBase quest, object afterPrompt)
    {
        logger.LogInfo("\nQuest accepted: " + quest.DisplayName + "(" + quest.name + ").");
    }

    // rename manual restore points
    [HarmonyPrefix]
    [HarmonyPatch(typeof(GameManager), "DoSaveRestorePoint")]
    private static bool DoSaveRestorePoint(GameManager __instance, int saveSlot, AutoSaveName autoSaveName, SaveGameData saveData, Action<bool> callback)
    {
        if (isManualRestore)
        {
            logger.LogInfo($"Creating \"Restorepoint_{lastRestore}\" restore point ({autoSaveName.ToString()})");
            RestorePointData restorePointData = new RestorePointData(saveData, autoSaveName);
            restorePointData.SetVersion();
            restorePointData.SetDateString();
            string jsonData = SaveDataUtility.SerializeSaveData(restorePointData);
            byte[] bytesForSaveJson = __instance.GetBytesForSaveJson(jsonData);
            Platform.Current.CreateSaveRestorePoint(saveSlot, $"UserRestorePoint_{lastRestore}", true, bytesForSaveJson, callback);
            return false; // Skip original method
        }
        return true;
    }
}