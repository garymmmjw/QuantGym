# QuantGuide Question

## 837. Josephus' Dilemma

**Metadata**

- ID: `f9d7gN5z6Kw92pKeU1QY`
- URL: https://www.quantguide.io/questions/josephus-dilemma
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 4
- Companies: Belvedere Trading, Virtu Financial
- Source: Kaushik - Belvedere OA/Personal
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-4 23:02:12 America/New_York
- Last Edited By: Gabe

### 题干

$$2000$ soldiers get captured in war, including yourself. Rather than feeding information to the opposing side, you and your fellow soldiers decide it is honorable to kill one another until there is one person standing and they can kill themselves. However, you know that if you are the last person still alive, there’s a good chance that you can escape and be free. The process in killing other soldiers is as follows: all soldiers stand in a circle and Person 1 starts with a sword. Person 1 kills Person 2 and gives the next soldier the sword (in this case Person 3). This process continues going around the circle till there’s one person left. What position in this circle should you stand to be the last person alive?

### Hint

Start will a small $n$ where $n$ is the number of soldiers and try to spot a pattern.

### 解答

This is a classic brain teaser known as the Josephus Problem. The best way to solve this problem is to start with simpler cases and see which position is the last alive. When there’s only $1$ person, Person 1 is the last to be alive (obviously). $2$ people, still Person 1. $3$ people, Person 3 is the last to remain alive. $4$ people, Person 1 is last. If you keep doing this, you’ll notice that when there are $2^n$ soldiers, Person 1 is the last to be alive. The greatest power of $2$ that's less than or equal to $2000$ is $1024$. This means that $976$ soldiers have to be killed and then the person that has the sword will be the one to last be alive. After $n$ people have been killed, the $2n+1$ Person will have the sword. For our case, this comes out to $2*976+1 = 1953$. Thus you should be in the $1953^{rd}$ position of the circle to be the last person alive. 
$\\$
For a more general case with $N$ people in the circle, we can express $N$ as $2^n+r$ and the position last to survive is $2r+1$. 


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1953"
    ],
    "companies": [
      {
        "company": "Belvedere Trading"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "f9d7gN5z6Kw92pKeU1QY",
    "internalDifficulty": 4,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:02:12 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6877288,
    "randomizable": "",
    "source": "Kaushik - Belvedere OA/Personal",
    "status": "published",
    "tags": [],
    "title": "Josephus' Dilemma",
    "topic": "brainteasers",
    "urlEnding": "josephus-dilemma",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Belvedere Trading"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "hard",
    "id": "f9d7gN5z6Kw92pKeU1QY",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Josephus' Dilemma",
    "topic": "brainteasers",
    "urlEnding": "josephus-dilemma"
  }
}
```
