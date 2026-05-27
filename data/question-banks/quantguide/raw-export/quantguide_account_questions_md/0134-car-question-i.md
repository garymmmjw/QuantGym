# QuantGuide Question

## 134. Car Question

**Metadata**

- ID: `TuMo2bGSyksqeLFKbr4B`
- URL: https://www.quantguide.io/questions/car-question-i
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: DE Shaw
- Source: tqd
- Tags: Conditional Probability, Conditional Expectation, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 17:18:41 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that we have $2$ cars parked in a line occupying spaces $1$ and $2$ of a parking lot. Spaces $3$ and $4$ are initially empty. Every minute, a car is considered eligible to move forward one space if a) the space in front of them is empty prior to any potential moves and b) label of the space they are on is less than $4$. Suppose that every minute, if a car is eligible to move, it moves forward one space with probability $1/2$. What is the expected amount of minutes before the cars occupy spaces $3$ to $4$? 

$$$$

$\textbf{Note:}$ The space in front must be empty before any moves. For example, on the first turn, only the car in space $2$ is eligible to move. 

### Hint

Let $E_{ij}$ represent the expected number of minutes before the cars are in spaces $3$ and $4$ when the cars are in spaces $i < j$. Clearly $E_{34} = 0$, as we already have reached our goal. We want $E_{12}$. The number of turns needed for a car to move forward to the next spot is $N \sim \text{Geom}(1/2)$. The first step is that we need the car in space $2$ to move to space $3$. This takes $2$ minutes on average, so $E_{12} = 2 + E_{13}$. Use the result of First Flip to say $\mathbb{E}[X \mid X < Y] = \mathbb{E}[X \mid X = Y] = \dfrac{4}{3}$, where $X,Y \sim \text{Geom}(1/2)$ IID.

### 解答

Let $E_{ij}$ represent the expected number of minutes before the cars are in spaces $3$ and $4$ when the cars are in spaces $i < j$. Clearly $E_{34} = 0$, as we already have reached our goal. We want $E_{12}$. The number of turns needed for a car to move forward to the next spot is $N \sim \text{Geom}(1/2)$. The first step is that we need the car in space $2$ to move to space $3$. This takes $2$ minutes on average, so $E_{12} = 2 + E_{13}$.

$$$$

Now, from this state, there are three possibilities that occur with equal probability: the car in space $1$ moves before the car in space $3$, the car in space $3$ moves before the car in space $1$, or the cars both move at the same time. We will use Law of Total Expectation to condition on which of the cars moves first from this state. You can prove these are equally probable by computing $\mathbb{P}[X = Y]$, where $X,Y \sim \text{Geom}(1/2)$ IID and using the exchangeability of the random variables. Furthermore, we use the result of First Flip to say $\mathbb{E}[X \mid X < Y] = \mathbb{E}[X \mid X = Y] = \dfrac{4}{3}$. Taking these for granted, let's compute the conditional expectation in each case. 

$$$$

$\textbf{Space 1 Moves Before Space 3:}$ In this case, we reach a state where the cars are in spaces $2$ and $3$. By the first fact above, it takes an average of $\dfrac{4}{3}$ minutes for the first car to move conditioned on this. Then, the car in space $3$ needs to move to space $4$, taking an average of $2$ minutes. Lastly, the car in space $2$ needs to move to space $3$, taking an average of $2$ minutes as well. The expected time in this case to reach the end is $\dfrac{4}{3} + 2 + 2 = \dfrac{16}{3}$.

$$$$

$\textbf{Space 3 Moves Before Space 2:}$ In this case, we reach a state where the cars are in spaces $1$ and $4$. By the first fact above, it takes an average of $\dfrac{4}{3}$ minutes for the car in space $3$ to move conditioned on this. Then, the car in space $1$ needs to move to space $3$, which means it must move from space $1$ to $2$ and then $2$ to $3$. This takes an average of $2$ minutes per space, meaning the expected time to reach the end in this case is $\dfrac{4}{3} + 4 = \dfrac{16}{3}$.

$$$$

$\textbf{Both Move Simultaneously:}$ In this case, we reach a state where the cars are in spaces $2$ and $4$. It again takes an average of $\dfrac{4}{3}$ minutes for the cars to move conditioned on this. Then, all that needs to occur is a movement of the car in space $2$ to space $3$, which takes $2$ minutes on average. Therefore, the expected time to reach the end in this case is $\dfrac{4}{3} + 2 = \dfrac{10}{3}$.

$$$$

By the Law of Total Expectation, $E_{13} = \dfrac{1}{3}\left(\dfrac{16}{3} + \dfrac{16}{3} + \dfrac{10}{3}\right) = \dfrac{14}{3}$. Therefore, by our initial equation $E_{12} = 2 + E_{13} = \dfrac{20}{3}$.



### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "20/3"
    ],
    "companies": [
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "TuMo2bGSyksqeLFKbr4B",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 17:18:41 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 960516,
    "source": "tqd",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Car Question",
    "topic": "probability",
    "urlEnding": "car-question-i",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "hard",
    "id": "TuMo2bGSyksqeLFKbr4B",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Car Question",
    "topic": "probability",
    "urlEnding": "car-question-i"
  }
}
```
