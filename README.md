# Lidar-Defect-Viewer-
An FYP web platform for interactive 3D defect reporting, built by processing LiDAR (IFC) scan data and rendering it with three.js.

# Interactive Web-Based System for 3D Defect Reporting Using LIDAR Scans

This is the Final Year Project of Mohamad Imran Bin Mansor (301844), supervised by Dr. Muhammad Syafiq Bin Mohd Pozi.

## 1. Problem Statement

In Malaysia, managing building defects during the 24-month defect liability period (DLP) mandated by the Housing Development Act (HDA) is often a manual and inefficient process.

Modern tools like Metaroom can capture 3D LiDAR scans and "Snapshot" images of defects[cite: 13]. [cite_start]However, a significant gap exists: this captured data (like `.ifc` files) often severs the link between the defect image and its precise 3D coordinate, requiring specialized software or manual cross-referencing to review.

## 2. Project Objectives

[cite_start]This project aims to build an automated pipeline and web dashboard to solve this problem.

1.  **To store** reported defect data, including descriptions and precise 3D coordinates, in a structured database (Firebase).
2.  [**To implement** a Python module to automatically process `.ifc` scan files, extracting both the 3D model and the defect "Snapshot" information.
3.  **To build** an intuitive web dashboard (using `three.js`) that displays the 3D model overlaid with interactive visual markers at each defect's location.

## 3. Tech Stack

* **Backend/Processing:** Python (`ifcopenshell`)
* **Database:** Google Firebase (Firestore & Storage)
* **Frontend:** HTML, CSS, JavaScript
* **3D Rendering:** `three.js` 
