# QuantGuide Question

## 1006. Life Support

**Metadata**

- ID: `biJq8z0Aa9u4FWOQXLBC`
- URL: https://www.quantguide.io/questions/life-support
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 1
- Companies: WorldQuant
- Source: https://www.glassdoor.com/Interview/The-population-of-desolate-remote-planet-is-kept-alive-by-a-life-support-system-The-population-quadruples-every-54-years-QTN_2566574.htm
- Tags: Pure Math
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-6 21:27:03 America/New_York
- Last Edited By: Gabe

### 题干

The population of a space station on a recolonization mission is kept alive by its expandable life support system. Given they are trying to repopulate, the population aboard the station quadruples every 54 years, but the life support system capacity can only be doubled every 54 years. Suppose the initial population is 2 people and the initial life support system has a capacity for 16384 people. How many years will pass before the population reaches the capacity of the support system?

### Hint

Start by setting up a system of equations to solve for time required for the station population and life support system population to be equal.

### 解答

Here we can set up a basic system of equations to solve. First, we want to find out how many units (in this case time windows of $54$ years) will it take, for the support system capacity and population aboard the space station to be equal. In our equations, $X$ will be units of time, and $Y$ will be total years.
$$$$
Thus our first equation will solve how many units until these populations are equal: 
$2 \cdot 4^X = 16384 \cdot 2^X$
$$$$
And our second will convert these units into the appropriate amount of years:
$Y = 54X$
$$$$
Solving for $X$ in the first equation, we get $X = 13$, and then plugging this answer into our second equation, we get $Y = 702$, yielding $702$ years as our answer.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "702"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "biJq8z0Aa9u4FWOQXLBC",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-6 21:27:03 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8194803,
    "source": "https://www.glassdoor.com/Interview/The-population-of-desolate-remote-planet-is-kept-alive-by-a-life-support-system-The-population-quadruples-every-54-years-QTN_2566574.htm",
    "status": "published",
    "tags": [
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Life Support",
    "topic": "pure math",
    "urlEnding": "life-support",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "id": "biJq8z0Aa9u4FWOQXLBC",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Life Support",
    "topic": "pure math",
    "urlEnding": "life-support"
  }
}
```
