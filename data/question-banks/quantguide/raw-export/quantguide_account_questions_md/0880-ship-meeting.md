# QuantGuide Question

## 880. Ship Meeting

**Metadata**

- ID: `GRudqncFfTNSzTmU7kJP`
- URL: https://www.quantguide.io/questions/ship-meeting
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: WorldQuant
- Source: glassdoor
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 11:01:23 America/New_York
- Last Edited By: Gabe

### 题干

A pirate ship sets sail from island $A$ to island $B$. At the same time, another pirate ship starts sailing from island $B$ to island $A$. Assume each ship stays along the same path between the two islands. The pirate ships pass other at $1:00$ PM and continue on their paths. One of them arrives at $5:00$ PM, the other at $10:00$ PM. At what time did the pirate ships set sail? Put your answer in military time, excluding the $0$ if the hour is only one digit. For example, if the answer is $4:30$ PM, answer $1630$.

### Hint

Let's call the two ships $1$ and $2$ in the order presented in the question. WLOG, let ship $1$ arrive at $5:00$ PM and ship $2$ arrive at $10:00$ PM. Clearly ship $2$ is sailing at a slower speed than ship $1$, as it took longer from the meeting point and they left at the same time. Let $v_1$ and $v_2$ be the velocities of the two ships and $d$ be the total distance between the islands. From the meeting point, what is the distance between the two islands in terms of $v_1$ and $v_2$?

### 解答

Let's call the two ships $1$ and $2$ in the order presented in the question. WLOG, let ship $1$ arrive at $5:00$ PM and ship $2$ arrive at $10:00$ PM. Clearly ship $2$ is sailing at a slower speed than ship $1$, as it took longer from the meeting point and they left at the same time. Let $v_1$ and $v_2$ be the velocities of the two ships and $d$ be the total distance between the islands. From the meeting point, the distance to island $B$ is $4v_1$, as it takes $4$ hours to get to island $B$ afterwards. Similarly, the distance to island $A$ is $9v_2$, as it takes $9$ hours afterwards to get to island $A$. Therefore, $d = 4v_1 + 9v_2$.

$$$$

However, the time travelled to get to that meeting point for ship $1$ was $\dfrac{9v_2}{v_1}$, as it travels at a rate of $v_1$. Similarly, the time travelled to get to that meeting point for ship $2$ was $\dfrac{4v_1}{v_2}$. Since they left at the same time, these are equal, and we get that $v_1 = \dfrac{3}{2}v_2$ by the above. 

$$$$

This means that the time travelled beforehand is $\dfrac{4 \cdot \frac{3}{2}v_2}{v_2} = 6$ hours. so both ships left at $7:00$ AM. Our answer is $700$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "700"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "GRudqncFfTNSzTmU7kJP",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 11:01:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7221393,
    "source": "glassdoor",
    "status": "published",
    "tags": [],
    "title": "Ship Meeting",
    "topic": "brainteasers",
    "urlEnding": "ship-meeting",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "id": "GRudqncFfTNSzTmU7kJP",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Ship Meeting",
    "topic": "brainteasers",
    "urlEnding": "ship-meeting"
  }
}
```
