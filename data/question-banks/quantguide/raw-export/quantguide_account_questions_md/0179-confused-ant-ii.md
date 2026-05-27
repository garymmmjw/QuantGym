# QuantGuide Question

## 179. Confused Ant II

**Metadata**

- ID: `zpCpozJifXIiPeTuPJtK`
- URL: https://www.quantguide.io/questions/confused-ant-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Akuna, Jane Street, WorldQuant
- Source: Kaushik - Discord
- Tags: Conditional Expectation, Expected Value
- Premium: False
- Solution Free: False
- Version: 5
- Last Edited: 2023-9-17 15:35:41 America/New_York
- Last Edited By: Gabe

### 题干

An ant walks the corner of a 3D cube and moves to one of the three adjacent vertices with equal probability at each step. Find the expected number of steps needed for the ant to return to the vertex it started at.


### Hint

Think about the different states of this phenomenon. 

### 解答

This seems like a very complicated problem on the surface but you can actually use Markov Chains to solve this problem. There is a lot of symmetry in cubes to help us decrease the number of states involved in this question. Let’s let your starting state be $E_{00}$. No matter which way the ant goes, by symmetry it’ll basically always be the same position. That position being $1$ side length away from the starting vertex. Lets denote the expected number of moves to get back to the initial vertex as $E_{1}$. Thus $E_{00} = E_{1}+1$. Let $E_{2}$ be the expected number of moves from being in the state of $2$ side lengths away from the starting vertex. Finally, let $E_{3}$ be the expected moves from being at the opposite vertex of the starting vertex. The equations for all these states are:
$$
E_{00} = E_{1}+1
$$$$
E_{1} = \frac{2}{3}E_{2}+\frac{1}{3}E_{0}+1
$$$$
E_{2} = \frac{2}{3}E_{1}+\frac{1}{3}E_{3}+1
$$$$
E_{3} = E_{2}+1
$$$$
$$
We know that $E_{0}=0$. Solving all of these equations, we get $E_{00}=8$. Thus it takes $8$ steps for the ant to start at one vertex of the cube and return to it. 


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "8"
    ],
    "companies": [
      {
        "company": "Akuna"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "zpCpozJifXIiPeTuPJtK",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-17 15:35:41 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1405965,
    "source": "Kaushik - Discord",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Confused Ant II",
    "topic": "probability",
    "urlEnding": "confused-ant-ii",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Akuna"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "id": "zpCpozJifXIiPeTuPJtK",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Confused Ant II",
    "topic": "probability",
    "urlEnding": "confused-ant-ii"
  }
}
```
